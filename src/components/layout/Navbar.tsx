'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/realms', label: 'Realms', icon: '🌍' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  // { href: '/tournament', label: 'Tournament', icon: '⚔️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme, soundEnabled, toggleSound } = useUIStore();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  };

  // Don't show navbar on landing or auth pages
  const hideNav = pathname === '/' || pathname.startsWith('/auth');
  if (hideNav) return null;

  return (
    <>
      {/* Desktop Nav */}
      <nav className="glass-strong sticky top-0 z-50 border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <img src="/logo.png" alt="WarisanVerse" className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-primary-500/20" />
              <span className="text-xl font-bold gradient-text hidden sm:inline">
                WarisanVerse
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
                      isActive
                        ? 'bg-primary-600/20 text-primary-400 neon-glow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    )}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors text-lg"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={toggleSound}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors text-lg"
                aria-label="Toggle sound"
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>

              <button
                onClick={handleLogout}
                className="hidden sm:flex p-2 rounded-xl hover:bg-white/5 transition-colors text-lg"
                aria-label="Logout"
                title="Logout"
              >
                🚪
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!isMobileOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed inset-x-0 top-16 z-40 glass-strong border-b border-[var(--border-color)]"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3',
                      isActive
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    )}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full mt-4 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 text-red-400 hover:bg-red-500/10"
              >
                <span className="text-xl">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
