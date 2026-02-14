import { createClient } from '@/lib/supabase/client';
import { calculateMatchXP, calculateMatchGold, calculateLevel, getTier } from '@/lib/gamification';
import { CURRENT_SEASON } from '@/lib/constants';
import type { GameMode, RealmName, MatchResult } from '@/types';

/**
 * Submits game result to Supabase.
 * Updates: Profile (XP/Gold/Level), Realm Progress, Match History, Leaderboard.
 */
export async function submitGameResult(
  realm: RealmName,
  mode: GameMode,
  result: MatchResult,
  userId: string
): Promise<{ success: boolean; error?: string; xp?: number; gold?: number }> {
  try {
    const supabase = createClient();

    // 1. Calculate Rewards
    const xpEarned = calculateMatchXP({
      won: result.winnerId === userId,
      isDraw: result.isDraw,
      mode,
      streakBonus: 0,
      duration: result.duration,
    });

    const goldEarned = calculateMatchGold({
      won: result.winnerId === userId,
      mode,
    });

    // 2. Fetch Current User Stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp, gold, total_wins, total_matches, level')
      .eq('id', userId)
      .single();

    if (profileError || !profile) throw new Error('Failed to fetch profile');

    // 3. Update Profile (XP, Gold, Level, Stats)
    const newXP = (profile.xp || 0) + xpEarned;
    const newGold = (profile.gold || 0) + goldEarned;
    const newWins = (profile.total_wins || 0) + (result.winnerId === userId ? 1 : 0);
    const newMatches = (profile.total_matches || 0) + 1;
    const levelInfo = calculateLevel(newXP);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        gold: newGold,
        level: levelInfo.level,
        title: levelInfo.title,
        total_wins: newWins,
        total_matches: newMatches,
        last_login: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw new Error('Failed to update profile stats');

    // 4. Update Realm Progress
    const { data: realmProgress, error: progressError } = await supabase
      .from('realms_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('realm_name', realm)
      .single();

    let realmRankPoints = 0;

    if (!progressError && realmProgress) {
      let rankChange = 0;
      if (result.winnerId === userId) rankChange = 25;
      else if (result.isDraw) rankChange = 5;
      else rankChange = -10;

      const currentRankPoints = realmProgress.rank_points || 0;
      realmRankPoints = Math.max(0, currentRankPoints + rankChange);

      // Track streaks
      const isWin = result.winnerId === userId;
      const newStreak = isWin ? (realmProgress.current_streak || 0) + 1 : 0;
      const bestStreak = Math.max(realmProgress.best_streak || 0, newStreak);

      await supabase
        .from('realms_progress')
        .update({
          rank_points: realmRankPoints,
          wins: (realmProgress.wins || 0) + (isWin ? 1 : 0),
          losses: (realmProgress.losses || 0) + (!isWin && !result.isDraw ? 1 : 0),
          draws: (realmProgress.draws || 0) + (result.isDraw ? 1 : 0),
          total_games: (realmProgress.total_games || 0) + 1,
          highest_score: Math.max(realmProgress.highest_score || 0, result.scores[userId] || 0),
          current_streak: newStreak,
          best_streak: bestStreak,
          updated_at: new Date().toISOString(),
        })
        .eq('id', realmProgress.id);
    } else if (progressError && progressError.code === 'PGRST116') {
      realmRankPoints = result.winnerId === userId ? 25 : 0;
      await supabase.from('realms_progress').insert({
        user_id: userId,
        realm_name: realm,
        wins: result.winnerId === userId ? 1 : 0,
        losses: result.winnerId !== userId && !result.isDraw ? 1 : 0,
        draws: result.isDraw ? 1 : 0,
        total_games: 1,
        highest_score: result.scores[userId] || 0,
        rank_points: realmRankPoints,
        current_streak: result.winnerId === userId ? 1 : 0,
        best_streak: result.winnerId === userId ? 1 : 0,
      });
    }

    // 5. Create Match History Record
    const { error: matchError } = await supabase
      .from('matches')
      .insert({
        realm,
        mode,
        player1_id: userId,
        player2_id: null,
        winner_id: result.winnerId === userId ? userId : null,
        score_player1: result.scores[userId] || 0,
        score_player2: result.scores['ai'] || 0,
        duration_seconds: result.duration,
        status: 'completed',
        completed_at: new Date().toISOString(),
        match_data: { 
          xpEarned, 
          goldEarned,
          opponent: 'ai',
          winner: result.winnerId,
        },
      });

    if (matchError) throw new Error('Failed to create match history: ' + matchError.message);

    // 6. Update Leaderboard — Realm
    await upsertLeaderboard(supabase, userId, realm, realmRankPoints);

    // 7. Update Leaderboard — Global (sum of all realm points)
    const { data: allProgress } = await supabase
      .from('realms_progress')
      .select('rank_points')
      .eq('user_id', userId);

    const globalPoints = (allProgress || []).reduce((sum, p) => sum + (p.rank_points || 0), 0);
    await upsertLeaderboard(supabase, userId, 'global', globalPoints);

    return { success: true, xp: xpEarned, gold: goldEarned };
  } catch (error) {
    console.error('Error submitting game result:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Upsert a leaderboard entry for a user in a specific realm/global.
 */
async function upsertLeaderboard(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  realm: string,
  totalPoints: number
) {
  const tier = getTier(totalPoints);

  // Check if entry exists
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('id')
    .eq('user_id', userId)
    .eq('season', CURRENT_SEASON)
    .eq('realm', realm)
    .single();

  if (existing) {
    await supabase
      .from('leaderboard')
      .update({
        total_points: totalPoints,
        tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('leaderboard')
      .insert({
        user_id: userId,
        season: CURRENT_SEASON,
        realm,
        total_points: totalPoints,
        tier,
      });
  }
}
