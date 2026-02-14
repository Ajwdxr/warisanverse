'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { REALM_INFO } from '@/lib/constants';
import { type RealmName } from '@/types';
import { getRealmRoute, getRealmClass } from '@/lib/utils';

const realms = Object.entries(REALM_INFO) as [RealmName, typeof REALM_INFO[RealmName]][];

export default function RealmsPage() {
  return (
    <div className="min-h-screen batik-bg p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            The <span className="gradient-text">Realms</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Choose your battleground. Each realm offers a unique competitive experience rooted in Malaysian heritage.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {realms.map(([key, realm], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={getRealmRoute(key)}>
                <div
                  className={`game-card ${getRealmClass(key)} p-8 h-full cursor-pointer group relative overflow-hidden`}
                >
                  {/* Background icon */}
                  <div className="absolute -right-4 -bottom-4 text-[120px] opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    {realm.icon}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-5xl">{realm.icon}</span>
                      <div>
                        <h2 className="text-2xl font-bold">{realm.name}</h2>
                        <p className="text-sm font-medium" style={{ color: realm.color }}>
                          {realm.subtitle}
                        </p>
                      </div>
                    </div>

                    <p className="text-[var(--text-secondary)] text-sm mb-5 leading-relaxed">
                      {realm.description}
                    </p>

                    {/* Lore */}
                    <div className="glass rounded-xl p-4 mb-5">
                      <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                        &ldquo;{realm.loreIntro}&rdquo;
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {realm.features.map((f) => (
                        <span
                          key={f}
                          className="px-3 py-1.5 text-xs rounded-full font-medium"
                          style={{
                            backgroundColor: `${realm.color}15`,
                            color: realm.color,
                            border: `1px solid ${realm.color}30`,
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                        <span>📊 {realm.difficulty}</span>
                        <span>👥 {realm.playerCount}</span>
                      </div>
                      <span
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all group-hover:scale-105"
                        style={{
                          backgroundColor: `${realm.color}20`,
                          color: realm.color,
                        }}
                      >
                        Play Now →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
