import { type LevelInfo, type AchievementDefinition, type Profile, type RealmProgress } from '@/types';

// ---- XP & Level System ----
const XP_TABLE = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9500, 11200, 13100, 15200, 17500, 20000,
  23000, 26500, 30500, 35000, 40000, 46000, 53000, 61000, 70000, 80000,
];

const TITLES = [
  'Newcomer', 'Apprentice', 'Initiate', 'Adept', 'Warrior',
  'Champion', 'Elite', 'Master', 'Grandmaster', 'Legend',
  'Mythical', 'Immortal', 'Transcendent', 'Ethereal', 'Divine',
  'Celestial', 'Cosmic', 'Primordial', 'Omniscient', 'Ascended',
  'Sovereign', 'Emperor', 'Titan', 'Demigod', 'Deity',
  'Archon', 'Supreme', 'Infinite', 'Eternal', 'WarisanVerse',
];

export function calculateLevel(totalXP: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (totalXP >= XP_TABLE[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentLevelXP = XP_TABLE[level - 1] || 0;
  const nextLevelXP = XP_TABLE[level] || XP_TABLE[XP_TABLE.length - 1] + 10000;
  const progress = (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP);

  return {
    level,
    currentXP: totalXP,
    requiredXP: nextLevelXP,
    progress: Math.min(Math.max(progress, 0), 1),
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
  };
}

// ---- XP Rewards ----
export function calculateMatchXP(params: {
  won: boolean;
  isDraw: boolean;
  mode: string;
  streakBonus: number;
  duration: number;
}): number {
  let base = 20;

  if (params.won) base += 30;
  if (params.isDraw) base += 10;

  // Mode multiplier
  const modeMultipliers: Record<string, number> = {
    solo: 0.5,
    ai: 0.8,
    casual: 1.0,
    ranked: 1.5,
  };
  base *= modeMultipliers[params.mode] || 1;

  // Streak bonus
  base += Math.min(params.streakBonus * 5, 50);

  // Duration bonus (longer games = more XP, capped)
  base += Math.min(Math.floor(params.duration / 60) * 2, 20);

  return Math.floor(base);
}

export function calculateMatchGold(params: {
  won: boolean;
  mode: string;
}): number {
  let gold = 5;
  if (params.won) gold += 15;

  const modeMultipliers: Record<string, number> = {
    solo: 0.3,
    ai: 0.5,
    casual: 1.0,
    ranked: 1.5,
  };
  gold *= modeMultipliers[params.mode] || 1;

  return Math.floor(gold);
}

// ---- Rank Tier ----
export function getTier(points: number): string {
  if (points >= 5000) return 'legend';
  if (points >= 3500) return 'diamond';
  if (points >= 2500) return 'platinum';
  if (points >= 1500) return 'gold';
  if (points >= 800) return 'silver';
  return 'bronze';
}

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#00CED1',
    diamond: '#B9F2FF',
    legend: '#FF4500',
  };
  return colors[tier] || '#CD7F32';
}

// ---- Achievement Definitions ----
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: 'first_win',
    name: 'First Victory',
    description: 'Win your first match in any realm',
    category: 'general',
    rarity: 'common',
    xpReward: 50,
    goldReward: 25,
    icon: '🏆',
    condition: (p) => p.total_wins >= 1,
  },
  {
    key: 'ten_wins',
    name: 'Rising Warrior',
    description: 'Win 10 matches across all realms',
    category: 'general',
    rarity: 'common',
    xpReward: 100,
    goldReward: 50,
    icon: '⚔️',
    condition: (p) => p.total_wins >= 10,
  },
  {
    key: 'hundred_wins',
    name: 'Battle Hardened',
    description: 'Win 100 matches across all realms',
    category: 'general',
    rarity: 'rare',
    xpReward: 500,
    goldReward: 200,
    icon: '🛡️',
    condition: (p) => p.total_wins >= 100,
  },
  {
    key: 'congkak_master',
    name: 'Congkak Master',
    description: 'Win 50 Congkak matches',
    category: 'congkak',
    rarity: 'epic',
    xpReward: 300,
    goldReward: 150,
    icon: '🎯',
    condition: (_, progress) => {
      const cp = progress.find((p) => p.realm_name === 'congkak');
      return (cp?.wins || 0) >= 50;
    },
  },
  {
    key: 'gasing_champion',
    name: 'Guni Champion',
    description: 'Win 50 Guni races',
    category: 'gasing',
    rarity: 'epic',
    xpReward: 300,
    goldReward: 150,
    icon: '🏃',
    condition: (_, progress) => {
      const gp = progress.find((p) => p.realm_name === 'gasing');
      return (gp?.wins || 0) >= 50;
    },
  },
  {
    key: 'seremban_reflex',
    name: 'Lightning Reflexes',
    description: 'Score 10000+ in Batu Seremban',
    category: 'batu-seremban',
    rarity: 'epic',
    xpReward: 300,
    goldReward: 150,
    icon: '⚡',
    condition: (_, progress) => {
      const bp = progress.find((p) => p.realm_name === 'batu-seremban');
      return (bp?.highest_score || 0) >= 10000;
    },
  },
  {
    key: 'wau_skywalker',
    name: 'Skywalker',
    description: 'Survive 5 minutes in Wau Bulan',
    category: 'wau-bulan',
    rarity: 'epic',
    xpReward: 300,
    goldReward: 150,
    icon: '🪁',
    condition: (_, progress) => {
      const wp = progress.find((p) => p.realm_name === 'wau-bulan');
      return (wp?.highest_score || 0) >= 300;
    },
  },
  {
    key: 'level_10',
    name: 'Veteran',
    description: 'Reach Level 10',
    category: 'general',
    rarity: 'rare',
    xpReward: 200,
    goldReward: 100,
    icon: '⭐',
    condition: (p) => p.level >= 10,
  },
  {
    key: 'all_realms',
    name: 'WarisanVerse Explorer',
    description: 'Play at least one match in every realm',
    category: 'general',
    rarity: 'rare',
    xpReward: 250,
    goldReward: 100,
    icon: '🌍',
    condition: (_, progress) =>
      progress.every((p) => p.total_games >= 1),
  },
  {
    key: 'gold_hoarder',
    name: 'Gold Hoarder',
    description: 'Accumulate 10,000 gold',
    category: 'general',
    rarity: 'legendary',
    xpReward: 500,
    goldReward: 0,
    icon: '💰',
    condition: (p) => p.gold >= 10000,
  },
];
