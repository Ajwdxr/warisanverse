'use client';

import { create } from 'zustand';
import { type RealmProgress, type Achievement, type InventoryItem, type LevelInfo } from '@/types';
import { calculateLevel } from '@/lib/gamification';

interface PlayerStoreState {
  xp: number;
  level: number;
  gold: number;
  realmProgress: RealmProgress[];
  achievements: Achievement[];
  inventory: InventoryItem[];
  levelInfo: LevelInfo;

  setPlayerData: (data: {
    xp: number;
    level: number;
    gold: number;
    realmProgress?: RealmProgress[];
    achievements?: Achievement[];
    inventory?: InventoryItem[];
  }) => void;
  addXP: (amount: number) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  unlockAchievement: (achievement: Achievement) => void;
  addToInventory: (item: InventoryItem) => void;
  updateRealmProgress: (realm: string, updates: Partial<RealmProgress>) => void;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  xp: 0,
  level: 1,
  gold: 100,
  realmProgress: [],
  achievements: [],
  inventory: [],
  levelInfo: calculateLevel(0),

  setPlayerData: (data) =>
    set({
      ...data,
      realmProgress: data.realmProgress || [],
      achievements: data.achievements || [],
      inventory: data.inventory || [],
      levelInfo: calculateLevel(data.xp),
    }),

  addXP: (amount) =>
    set((state) => {
      const newXP = state.xp + amount;
      const newLevelInfo = calculateLevel(newXP);
      return {
        xp: newXP,
        level: newLevelInfo.level,
        levelInfo: newLevelInfo,
      };
    }),

  addGold: (amount) =>
    set((state) => ({ gold: state.gold + amount })),

  spendGold: (amount) => {
    const state = get();
    if (state.gold < amount) return false;
    set({ gold: state.gold - amount });
    return true;
  },

  unlockAchievement: (achievement) =>
    set((state) => ({
      achievements: [...state.achievements, achievement],
    })),

  addToInventory: (item) =>
    set((state) => ({
      inventory: [...state.inventory, item],
    })),

  updateRealmProgress: (realm, updates) =>
    set((state) => ({
      realmProgress: state.realmProgress.map((rp) =>
        rp.realm_name === realm ? { ...rp, ...updates } : rp
      ),
    })),
}));
