import { type RealmName } from '@/types';

// ---- Realm Metadata ----
export const REALM_INFO: Record<RealmName, {
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  bgPattern: string;
  features: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  playerCount: string;
  loreIntro: string;
}> = {
  congkak: {
    name: 'Congkak',
    subtitle: 'Strategy Realm',
    description: 'A tactical board strategy game where every seed counts. Plan your moves, capture your opponent\'s seeds, and dominate the board.',
    icon: '🎯',
    color: '#E67E22',
    gradient: 'from-amber-500 via-orange-600 to-red-700',
    bgPattern: 'congkak-pattern',
    features: ['Tactical Board Strategy', 'Power Cards', 'Ranked Mode', 'Online Multiplayer'],
    difficulty: 'Medium',
    playerCount: '1-2 Players',
    loreIntro: 'In the ancient courts of the Malay kingdoms, Congkak was the game of nobles — a test of strategic brilliance passed down through generations.',
  },
  gasing: {
    name: 'Lari Dalam Guni',
    subtitle: 'Kampung Race',
    description: 'Hop your way to victory in this classic sack race. Master rhythm and timing to cross the finish line first!',
    icon: '🏃',
    color: '#D35400',
    gradient: 'from-amber-600 via-orange-700 to-red-800',
    bgPattern: 'guni-pattern',
    features: ['Rhythm-Based Racing', 'Physics Jumping', 'Kampung Atmosphere', 'Bot Challenges'],
    difficulty: 'Easy',
    playerCount: '1-4 Players',
    loreIntro: 'Lari Dalam Guni (Gunny Sack Race) is a staple of Malaysian Sukaneka (community sports), symbolizing fun, resilience, and village camaraderie.',
  },
  'batu-seremban': {
    name: 'Lawan Pemadam',
    subtitle: 'Table War',
    description: 'Relive the classroom rivalry! Flick your eraser and crush the opponent. Flag vs Flag.',
    icon: '🟦',
    color: '#E74C3C',
    gradient: 'from-blue-600 via-white to-red-600',
    bgPattern: 'pemadam-pattern',
    features: ['Physics Flicking', '1v1 Tactical', 'Flag Collection', 'Classroom Nostalgia'],
    difficulty: 'Medium',
    playerCount: '2 Players',
    loreIntro: 'Before Fortnite, there was Eraser Battle. A test of precision and bravery on the school desk battlefield.',
  },
  'wau-bulan': {
    name: 'Tuju Guli',
    subtitle: 'Marble Master',
    description: 'Aim, Flick, and Strike! Knock marbles out of the circle in this classic kampung game.',
    icon: '🎱',
    color: '#27AE60',
    gradient: 'from-green-500 via-emerald-600 to-teal-700',
    bgPattern: 'guli-pattern',
    features: ['Precision Aiming', 'Physics Collisions', 'Arena Strategy', 'Collection System'],
    difficulty: 'Easy',
    playerCount: '1 Player',
    loreIntro: 'Tuju Guli requires a sharp eye and steady hand. It was the test of accuracy for every village child.',
  },
  'teka-silang-kata': {
    name: 'Teka Silang Kata',
    subtitle: 'Malay Word Realm',
    description: 'Test your vocabulary in this traditional Malay crossword puzzle. Complete words to earn EXP and master the language of heritage.',
    icon: '📝',
    color: '#9B59B6',
    gradient: 'from-purple-500 via-violet-600 to-indigo-700',
    bgPattern: 'crossword-pattern',
    features: ['Malay Only', 'Level Progression', 'Time Challenge', 'Heritage Vocabulary'],
    difficulty: 'Medium',
    playerCount: '1 Player',
    loreIntro: 'Language is the soul of the nation. Teka Silang Kata has long been the favorite pastime in Malay households, bridging knowledge and fun.',
  },
};

// ---- Season ----
export const CURRENT_SEASON = 'season_1';
export const SEASON_NAME = 'Warisan Pertama';
export const SEASON_END_DATE = '2026-06-01T00:00:00Z';

// ---- XP Constants ----
export const XP_PER_WIN = 30;
export const XP_PER_LOSS = 10;
export const XP_PER_DRAW = 15;
export const GOLD_PER_WIN = 20;
export const GOLD_PER_LOSS = 5;

export const CROSSWORD_EXP_PER_WORD = 5;
export const CROSSWORD_EXP_LEVEL_BONUS = 50;

// ---- Game Constants ----
export const CONGKAK_PITS = 7;
export const CONGKAK_SEEDS_PER_PIT = 7;
export const GASING_ARENA_RADIUS = 300;
export const GASING_MAX_SPIN = 100;
export const BATU_SEREMBAN_STONES = 5;
export const WAU_BULAN_MAX_ALTITUDE = 1000;

// ---- UI Constants ----
export const APP_NAME = 'WarisanVerse';
export const APP_DESCRIPTION = 'A digital universe reimagining Malaysian traditional games into competitive, modern experiences.';
export const APP_URL = 'https://warisanverse.vercel.app';

// ---- Sound Paths ----
export const SOUNDS = {
  click: '/sounds/click.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  move: '/sounds/move.mp3',
  levelUp: '/sounds/level-up.mp3',
  achievement: '/sounds/achievement.mp3',
  match: '/sounds/match.mp3',
  countdown: '/sounds/countdown.mp3',
};
