'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { REALM_INFO, CURRENT_SEASON, SEASON_NAME } from '@/lib/constants';
import { type RealmName } from '@/types';
import { getTierColor } from '@/lib/gamification';
import { createClient } from '@/lib/supabase/client';

const realmOptions: { key: RealmName | 'global'; label: string }[] = [
  { key: 'global', label: '🌍 Global' },
  { key: 'congkak', label: '🎯 Congkak' },
  { key: 'gasing', label: '🏃 Lari Dalam Guni' },
  { key: 'batu-seremban', label: '⚔️ Lawan Pemadam' },
  { key: 'wau-bulan', label: '🎱 Tuju Guli' },
];

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  points: number;
  tier: string;
  wins: number;
  avatar: string;
  userId: string;
}

export default function LeaderboardPage() {
  const [selectedRealm, setSelectedRealm] = useState<RealmName | 'global'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedRealm]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch leaderboard entries for selected realm
      const { data: leaderboardData, error } = await supabase
        .from('leaderboard')
        .select('user_id, total_points, tier, rank')
        .eq('season', CURRENT_SEASON)
        .eq('realm', selectedRealm)
        .order('total_points', { ascending: false })
        .limit(20);

      if (error || !leaderboardData || leaderboardData.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch profile info for each user
      const userIds = leaderboardData.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, level, total_wins, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Also get realm-specific wins if not global
      let winsMap = new Map<string, number>();
      if (selectedRealm !== 'global') {
        const { data: progressData } = await supabase
          .from('realms_progress')
          .select('user_id, wins')
          .eq('realm_name', selectedRealm)
          .in('user_id', userIds);

        if (progressData) {
          progressData.forEach(p => winsMap.set(p.user_id, p.wins || 0));
        }
      }

      const formatted: LeaderboardEntry[] = leaderboardData.map((entry, i) => {
        const profile = profileMap.get(entry.user_id);
        return {
          rank: i + 1,
          username: profile?.username || 'Unknown',
          level: profile?.level || 1,
          points: entry.total_points || 0,
          tier: entry.tier || 'bronze',
          wins: selectedRealm !== 'global'
            ? (winsMap.get(entry.user_id) || 0)
            : (profile?.total_wins || 0),
          avatar: getRankEmoji(i + 1),
          userId: entry.user_id,
        };
      });

      setEntries(formatted);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  function getRankEmoji(rank: number): string {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🎮';
  }

  return (
    <div className="min-h-screen batik-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold mb-1">
            <span className="gradient-text-gold">Leaderboard</span>
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            {SEASON_NAME} · {CURRENT_SEASON.replace('_', ' ').toUpperCase()}
          </p>
        </motion.div>

        {/* Realm Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {realmOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedRealm(opt.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedRealm === opt.key
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/50'
                  : 'glass hover:bg-white/10 text-[var(--text-secondary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Loading...</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="game-card p-12 text-center">
            <span className="text-4xl block mb-4">🏆</span>
            <p className="text-lg font-bold mb-2">No Rankings Yet</p>
            <p className="text-[var(--text-secondary)]">Play some games to appear on the leaderboard!</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            {/* Top 3 Podium */}
            {entries.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-3 gap-3 mb-6"
              >
                {[1, 0, 2].map((idx) => {
                  const player = entries[idx];
                  if (!player) return null;
                  const isFirst = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`game-card p-4 text-center ${isFirst ? 'ring-2 ring-yellow-500/30' : ''} ${
                        player.userId === currentUserId ? 'ring-2 ring-primary-500/50' : ''
                      }`}
                      style={{ marginTop: isFirst ? 0 : 24 }}
                    >
                      <span className="text-3xl block mb-2">{player.avatar}</span>
                      <span className="text-xs font-mono" style={{ color: getTierColor(player.tier) }}>
                        #{player.rank}
                      </span>
                      <p className="font-bold text-sm mt-1">{player.username}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Lv.{player.level}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: getTierColor(player.tier) }}>
                        {player.points.toLocaleString()}
                      </p>
                      <span className={`text-xs capitalize tier-${player.tier}`}>{player.tier}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Full Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="game-card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-left text-xs text-[var(--text-secondary)]">
                      <th className="p-4">Rank</th>
                      <th className="p-4">Player</th>
                      <th className="p-4">Level</th>
                      <th className="p-4">Tier</th>
                      <th className="p-4">Points</th>
                      <th className="p-4">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((player, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-colors ${
                          player.userId === currentUserId ? 'bg-primary-500/10' : ''
                        }`}
                      >
                        <td className="p-4 font-mono text-sm" style={{ color: getTierColor(player.tier) }}>
                          #{player.rank}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span>{player.avatar}</span>
                            <span className="font-medium text-sm">
                              {player.username}
                              {player.userId === currentUserId && (
                                <span className="ml-2 text-xs text-primary-400">(You)</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{player.level}</td>
                        <td className="p-4">
                          <span className={`text-xs font-medium capitalize tier-${player.tier}`}>{player.tier}</span>
                        </td>
                        <td className="p-4 font-bold text-sm">{player.points.toLocaleString()}</td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">{player.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
