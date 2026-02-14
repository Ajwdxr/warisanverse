'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { REALM_INFO } from '@/lib/constants';
import { type RealmName } from '@/types';

const realms = Object.entries(REALM_INFO) as [RealmName, typeof REALM_INFO[RealmName]][];

export default function Home() {
  return (
    <div className="min-h-screen batik-bg">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-cyan/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-neon-magenta/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary-600/20 text-primary-400 border border-primary-600/30 mb-6">
              🎮 Enter the Digital Universe
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
          >
            <span className="gradient-text">WarisanVerse</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A digital universe reimagining Malaysian traditional games into
            competitive, modern, addictive experiences. Play Congkak, Lari Dalam Guni,
            Lawan Pemadam & Tuju Guli like never before.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 neon-glow text-lg"
            >
              Start Your Journey
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 glass rounded-2xl font-semibold hover:bg-white/10 transition-all text-lg text-[var(--text-primary)]"
            >
              Login
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Realms Preview */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Four <span className="gradient-text-gold">Realms</span> Await
            </h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
              Each realm is a unique competitive experience rooted in Malaysian heritage
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realms.map(([key, realm], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`game-card realm-${key === 'batu-seremban' ? 'seremban' : key === 'wau-bulan' ? 'wau' : key} p-8 relative overflow-hidden group`}
              >
                <div className="absolute top-0 right-0 w-40 h-40 opacity-5 text-8xl flex items-start justify-end p-4 pointer-events-none">
                  {realm.icon}
                </div>

                <div className="relative z-10">
                  <span className="text-4xl mb-4 block">{realm.icon}</span>
                  <h3 className="text-2xl font-bold mb-1">{realm.name}</h3>
                  <p className="text-sm font-medium mb-3" style={{ color: realm.color }}>
                    {realm.subtitle}
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
                    {realm.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {realm.features.map((f) => (
                      <span
                        key={f}
                        className="px-3 py-1 text-xs rounded-full bg-white/5 text-[var(--text-secondary)] border border-[var(--border-color)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span>📊 {realm.difficulty}</span>
                    <span>👥 {realm.playerCount}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              One <span className="gradient-text">Universe</span>, Endless Possibilities
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🌐', title: 'Global Profile', desc: 'One profile across all realms. Track your journey through WarisanVerse.' },
              { icon: '🏆', title: 'Seasonal Rankings', desc: 'Compete in ranked seasons. Climb from Bronze to Legend tier.' },
              { icon: '⚡', title: 'Real-time Multiplayer', desc: 'Challenge friends or matchmake against players worldwide.' },
              { icon: '🎖️', title: 'Achievements & Relics', desc: 'Unlock cultural relics and earn legendary achievements.' },
              { icon: '💰', title: 'Shared Economy', desc: 'Earn gold across realms. Unlock skins, power cards, and cosmetics.' },
              { icon: '📱', title: 'Play Anywhere', desc: 'PWA-ready. Install on your phone and play offline.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="game-card p-6"
              >
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="game-card p-12 neon-glow"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">
              Ready to Enter WarisanVerse?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Join thousands of players rediscovering Malaysian heritage through competitive gaming.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block px-10 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all text-lg"
            >
              Create Free Account
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            © 2026 WarisanVerse. Preserving heritage through gaming.
          </p>
          <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
            <span>🇲🇾 Made in Malaysia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
