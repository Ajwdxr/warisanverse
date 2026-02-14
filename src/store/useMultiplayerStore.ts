'use client';

import { create } from 'zustand';
import { type Room, type RealmName } from '@/types';

interface MultiplayerStoreState {
  currentRoom: Room | null;
  availableRooms: Room[];
  isSearching: boolean;
  isConnected: boolean;
  connectionError: string | null;

  setRoom: (room: Room | null) => void;
  setAvailableRooms: (rooms: Room[]) => void;
  setSearching: (searching: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  updateRoomState: (updates: Partial<Room>) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerStoreState>((set) => ({
  currentRoom: null,
  availableRooms: [],
  isSearching: false,
  isConnected: false,
  connectionError: null,

  setRoom: (currentRoom) => set({ currentRoom }),
  setAvailableRooms: (availableRooms) => set({ availableRooms }),
  setSearching: (isSearching) => set({ isSearching }),
  setConnected: (isConnected) => set({ isConnected }),
  setError: (connectionError) => set({ connectionError }),
  updateRoomState: (updates) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, ...updates }
        : null,
    })),
  reset: () =>
    set({
      currentRoom: null,
      isSearching: false,
      isConnected: false,
      connectionError: null,
    }),
}));
