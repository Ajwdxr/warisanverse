'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { REALM_INFO } from '@/lib/constants';
import { type RealmName } from '@/types';
import { getWinRate, getRealmRoute, getRealmClass } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { calculateLevel } from '@/lib/gamification';

interface ProfileData {
  username: string;
  level: number;
  xp: number;
  requiredXP: number;
  gold: number;
  title: string;
  totalMatches: number;
  totalWins: number;
  createdAt: string;
}

interface RealmProgress {
  realm: RealmName;
  wins: number;
  losses: number;
  highest: number;
  streak: number;
}

interface Achievement {
  name: string;
  icon: string;
  rarity: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [progress, setProgress] = useState<RealmProgress[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    if (newUsername === profile?.username) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Username already taken');
        }
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        const levelInfo = calculateLevel(profileData.xp || 0);
        const data = {
          username: profileData.username || 'Warrior',
          level: levelInfo.level,
          xp: levelInfo.currentXP,
          requiredXP: levelInfo.requiredXP,
          gold: profileData.gold || 0,
          title: levelInfo.title,
          totalMatches: profileData.total_matches || 0,
          totalWins: profileData.total_wins || 0,
          createdAt: profileData.created_at || '',
        };
        setProfile(data);
        setNewUsername(data.username);
      }

      // Realm Progress
      const { data: progressData } = await supabase
        .from('realms_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressData) {
        const formatted = progressData.map(p => ({
          realm: p.realm_name as RealmName,
          wins: p.wins || 0,
          losses: p.losses || 0,
          highest: p.highest_score || 0,
          streak: p.best_streak || 0,
        }));
        setProgress(formatted);
      }

      // Achievements
      const { data: achData } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id);

      if (achData && achData.length > 0) {
        const formatted = achData.map(a => ({
          name: a.achievement_name,
          icon: getAchievementIcon(a.achievement_key),
          rarity: a.rarity || 'common',
        }));
        setAchievements(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }

  function getAchievementIcon(key: string): string {
    const icons: Record<string, string> = {
      first_win: '🏆', ten_wins: '⚔️', hundred_wins: '🛡️',
      congkak_master: '🎯', gasing_champion: '🌀',
      seremban_reflex: '⚡', wau_skywalker: '🪁',
      level_10: '⭐', all_realms: '🌍', gold_hoarder: '💰',
    };
    return icons[key] || '🎖️';
  }

  if (loading) {
    return (
      <div className="min-h-screen batik-bg flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const displayProfile = profile || {
    username: 'Warrior', level: 0, xp: 0, requiredXP: 100, gold: 0,
    title: 'Newcomer', totalMatches: 0, totalWins: 0, createdAt: '',
  };

  const xpProgress = displayProfile.requiredXP > 0
    ? (displayProfile.xp / displayProfile.requiredXP) * 100
    : 0;

  return (
    <div className="min-h-screen batik-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-card p-8"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/20 border-2 border-primary-500/30">
              <img src="/logo.png" alt="WarisanVerse Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-2xl font-bold focus:outline-none focus:border-primary-500/50 w-full max-w-[200px]"
                      autoFocus
                      maxLength={15}
                    />
                    <button
                      onClick={handleUpdateUsername}
                      disabled={saving}
                      className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      {saving ? '...' : '✅'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNewUsername(displayProfile.username);
                        setError(null);
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      ❌
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <h1 className="text-3xl font-bold">{displayProfile.username}</h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-all"
                    title="Edit Username"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-primary-400 font-medium">{displayProfile.title} · Level {displayProfile.level}</p>
              {displayProfile.createdAt && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Joined {new Date(displayProfile.createdAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{displayProfile.totalMatches}</p>
                <p className="text-xs text-[var(--text-secondary)]">Matches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{displayProfile.totalWins}</p>
                <p className="text-xs text-[var(--text-secondary)]">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{getWinRate(displayProfile.totalWins, displayProfile.totalMatches)}%</p>
                <p className="text-xs text-[var(--text-secondary)]">Win Rate</p>
              </div>
            </div>
            <div className="flex sm:flex-col gap-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>


          {/* XP Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--text-secondary)]">Level {displayProfile.level}</span>
              <span className="text-[var(--text-secondary)]">{displayProfile.xp}/{displayProfile.requiredXP} XP</span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Realm Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-bold mb-4">Realm Progress</h2>
          {progress.length === 0 ? (
            <div className="game-card p-8 text-center">
              <p className="text-[var(--text-secondary)]">No realm progress yet. Start playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {progress.map((rp) => {
                const info = REALM_INFO[rp.realm];
                if (!info) return null;
                return (
                  <Link key={rp.realm} href={getRealmRoute(rp.realm)}>
                    <div className={`game-card ${getRealmClass(rp.realm)} p-5 cursor-pointer`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <h3 className="font-bold">{info.name}</h3>
                          <p className="text-xs" style={{ color: info.color }}>{info.subtitle}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-green-400">{rp.wins}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Wins</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-400">{rp.losses}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Losses</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-yellow-400">{rp.highest}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">High Score</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-orange-400">{rp.streak}🔥</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Streak</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xl font-bold mb-4">Achievements</h2>
          {achievements.length === 0 ? (
            <div className="game-card p-8 text-center">
              <span className="text-4xl block mb-2">🎖️</span>
              <p className="text-[var(--text-secondary)]">No achievements unlocked yet. Keep playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {achievements.map((ach, i) => (
                <div key={i} className="game-card p-4 text-center">
                  <span className="text-3xl block mb-2">{ach.icon}</span>
                  <p className="font-medium text-sm">{ach.name}</p>
                  <span className={`text-xs capitalize ${
                    ach.rarity === 'legendary' ? 'text-yellow-400' :
                    ach.rarity === 'epic' ? 'text-purple-400' :
                    ach.rarity === 'rare' ? 'text-blue-400' :
                    'text-[var(--text-secondary)]'
                  }`}>{ach.rarity}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
