'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { REALM_INFO, CURRENT_SEASON, SEASON_NAME } from '@/lib/constants';
import { type RealmName } from '@/types';
import { formatNumber, getRealmRoute, getRealmClass } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { calculateLevel } from '@/lib/gamification';

const realms = Object.entries(REALM_INFO) as [RealmName, typeof REALM_INFO[RealmName]][];

interface UserStats {
  level: number;
  xp: number;
  gold: number;
  totalMatches: number;
  totalWins: number;
  title: string;
  username: string;
}

interface RecentMatch {
  realm: string;
  result: string;
  score: string;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonRank, setSeasonRank] = useState<{ rank: number; tier: string } | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const levelInfo = calculateLevel(profile.xp || 0);
        setStats({
          level: levelInfo.level,
          xp: profile.xp || 0,
          gold: profile.gold || 0,
          totalMatches: profile.total_matches || 0,
          totalWins: profile.total_wins || 0,
          title: profile.title || 'Newcomer',
          username: profile.username || 'Warrior',
        });
      }

      // Fetch season rank
      const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('rank, tier')
        .eq('user_id', user.id)
        .eq('realm', 'global')
        .single();

      if (leaderboard) {
        setSeasonRank({ rank: leaderboard.rank || 0, tier: leaderboard.tier || 'bronze' });
      }

      // Fetch recent matches
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('player1_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (matches && matches.length > 0) {
        const formatted = matches.map((m: any) => ({
          realm: m.realm,
          result: m.winner_id === user.id ? 'win' : (m.status === 'draw' ? 'draw' : 'loss'),
          score: `${m.score_player1 || 0}`,
          time: getTimeAgo(new Date(m.created_at)),
        }));
        setRecentMatches(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Use real data or defaults (0)
  const displayStats = stats || {
    level: 0, xp: 0, gold: 0, totalMatches: 0, totalWins: 0, title: 'Newcomer', username: 'Warrior'
  };

  const levelInfo = calculateLevel(displayStats.xp);
  const winRate = displayStats.totalMatches > 0
    ? Math.round((displayStats.totalWins / displayStats.totalMatches) * 100)
    : 0;
  const xpProgress = levelInfo.requiredXP > 0 ? (levelInfo.currentXP / levelInfo.requiredXP) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen batik-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen batik-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Welcome back, <span className="gradient-text">{displayStats.username}</span>
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Season: <span className="text-primary-400">{SEASON_NAME}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="game-card px-4 py-2 flex items-center gap-2">
              <span>💰</span>
              <span className="font-bold text-yellow-400">{formatNumber(displayStats.gold)}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Level', value: levelInfo.level, icon: '⭐', sub: levelInfo.title },
            { label: 'Win Rate', value: `${winRate}%`, icon: '📊', sub: `${displayStats.totalWins}/${displayStats.totalMatches}` },
            { label: 'Total Matches', value: displayStats.totalMatches, icon: '🎮', sub: 'All realms' },
            { label: 'Season Rank', value: seasonRank ? `#${seasonRank.rank}` : '-', icon: '🏆', sub: seasonRank ? `${seasonRank.tier.charAt(0).toUpperCase() + seasonRank.tier.slice(1)} Tier` : 'Unranked' },
          ].map((stat, i) => (
            <div key={i} className="game-card p-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                <span>{stat.icon}</span>
                <span>{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-[var(--text-secondary)]">{stat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* XP Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="game-card p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Level {levelInfo.level} Progress</span>
            <span className="text-xs text-[var(--text-secondary)]">
              {formatNumber(levelInfo.currentXP)} / {formatNumber(levelInfo.requiredXP)} XP
            </span>
          </div>
          <div className="xp-bar">
            <motion.div
              className="xp-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Realm Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-4">Choose Your Realm</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {realms.map(([key, realm], i) => (
              <Link key={key} href={getRealmRoute(key)}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`game-card ${getRealmClass(key)} p-5 h-full cursor-pointer`}
                >
                  <span className="text-3xl block mb-3">{realm.icon}</span>
                  <h3 className="font-bold text-lg mb-0.5">{realm.name}</h3>
                  <p className="text-xs mb-3" style={{ color: realm.color }}>
                    {realm.subtitle}
                  </p>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>{realm.difficulty}</span>
                    <span>{realm.playerCount}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="game-card p-6"
        >
          <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">No matches yet. Start playing!</p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match, i) => {
                const info = REALM_INFO[match.realm as RealmName];
                if (!info) return null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{info.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{match.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">{match.score}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          match.result === 'win'
                            ? 'bg-green-500/20 text-green-400'
                            : match.result === 'draw'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {match.result.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
            // { href: '/tournament', icon: '⚔️', label: 'Tournament' },
            { href: '/profile', icon: '👤', label: 'Profile' },
            { href: '/realms', icon: '🌍', label: 'All Realms' },
          ].map((link) => (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileHover={{ y: -2 }}
                className="game-card p-4 text-center cursor-pointer"
              >
                <span className="text-2xl block mb-1">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
