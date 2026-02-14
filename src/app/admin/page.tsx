'use client';

import { motion } from 'framer-motion';
import { REALM_INFO } from '@/lib/constants';
import { type RealmName } from '@/types';

const mockStats = {
  totalUsers: 1247,
  activeToday: 342,
  totalMatches: 8540,
  revenue: '$0',
};

const realmStats = (Object.entries(REALM_INFO) as [RealmName, typeof REALM_INFO[RealmName]][]).map(([key, realm]) => ({
  key,
  name: realm.name,
  icon: realm.icon,
  color: realm.color,
  matches: Math.floor(Math.random() * 3000) + 500,
  activePlayers: Math.floor(Math.random() * 200) + 50,
  avgDuration: `${Math.floor(Math.random() * 10) + 3}m`,
}));

const mockRecentActivity = [
  { user: 'ShadowMaster', action: 'Won Congkak match', time: '2m ago' },
  { user: 'NeonWarrior', action: 'Reached Level 25', time: '5m ago' },
  { user: 'BatikQueen', action: 'New high score in Tuju Guli', time: '12m ago' },
  // { user: 'GuniKing', action: 'Joined Lari Dalam Guni race', time: '18m ago' },
  { user: 'ReflexGod', action: 'Unlocked "Veteran" achievement', time: '25m ago' },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen batik-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold">Admin <span className="gradient-text">Dashboard</span></h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Platform analytics overview</p>
        </motion.div>

        {/* High-level Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: mockStats.totalUsers.toLocaleString(), icon: '👥', color: 'text-blue-400' },
            { label: 'Active Today', value: mockStats.activeToday.toLocaleString(), icon: '🟢', color: 'text-green-400' },
            { label: 'Total Matches', value: mockStats.totalMatches.toLocaleString(), icon: '🎮', color: 'text-purple-400' },
            { label: 'Revenue', value: mockStats.revenue, icon: '💰', color: 'text-yellow-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="game-card p-4"
            >
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                <span>{stat.icon}</span>
                <span>{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Per-Realm Analytics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-bold mb-4">Realm Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {realmStats.map((realm, i) => (
              <div key={realm.key} className="game-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{realm.icon}</span>
                  <h3 className="font-bold">{realm.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Matches</span>
                    <span className="font-medium">{realm.matches.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Active</span>
                    <span className="font-medium" style={{ color: realm.color }}>{realm.activePlayers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Avg. Duration</span>
                    <span className="font-medium">{realm.avgDuration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="game-card p-4">
            <div className="space-y-3">
              {mockRecentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)]">
                  <div>
                    <span className="font-medium text-sm">{activity.user}</span>
                    <span className="text-[var(--text-secondary)] text-sm"> — {activity.action}</span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
