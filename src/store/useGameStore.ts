'use client';

import { create } from 'zustand';
import { type RealmName, type GameMode, type GameState, type PlayerState, type MatchResult } from '@/types';

interface GameStoreState {
  gameState: GameState | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentRealm: RealmName | null;
  currentMode: GameMode | null;
  matchResult: MatchResult | null;

  initGame: (realm: RealmName, mode: GameMode, players: PlayerState[]) => void;
  updateGameState: (updates: Partial<GameState>) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  endGame: (result: MatchResult) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: null,
  isPlaying: false,
  isPaused: false,
  currentRealm: null,
  currentMode: null,
  matchResult: null,

  initGame: (realm, mode, players) =>
    set({
      gameState: {
        realm,
        mode,
        status: 'initializing',
        currentTurn: 0,
        players,
        startedAt: Date.now(),
        elapsedTime: 0,
      },
      isPlaying: false,
      isPaused: false,
      currentRealm: realm,
      currentMode: mode,
      matchResult: null,
    }),

  updateGameState: (updates) =>
    set((state) => ({
      gameState: state.gameState ? { ...state.gameState, ...updates } : null,
    })),

  setPlaying: (isPlaying) =>
    set((state) => ({
      isPlaying,
      gameState: state.gameState
        ? { ...state.gameState, status: isPlaying ? 'playing' : 'paused' }
        : null,
    })),

  setPaused: (isPaused) =>
    set((state) => ({
      isPaused,
      gameState: state.gameState
        ? { ...state.gameState, status: isPaused ? 'paused' : 'playing' }
        : null,
    })),

  endGame: (result) =>
    set((state) => ({
      isPlaying: false,
      matchResult: result,
      gameState: state.gameState
        ? { ...state.gameState, status: 'ended' }
        : null,
    })),

  resetGame: () =>
    set({
      gameState: null,
      isPlaying: false,
      isPaused: false,
      currentRealm: null,
      currentMode: null,
      matchResult: null,
    }),
}));
