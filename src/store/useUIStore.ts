'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  musicEnabled: boolean;
  isSidebarOpen: boolean;
  activeModal: string | null;
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      theme: 'dark',
      soundEnabled: true,
      musicEnabled: true,
      isSidebarOpen: false,
      activeModal: null,
      isLoading: false,
      notification: null,

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () =>
        set((state) => ({ musicEnabled: !state.musicEnabled })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      openModal: (activeModal) => set({ activeModal }),
      closeModal: () => set({ activeModal: null }),
      setLoading: (isLoading) => set({ isLoading }),
      showNotification: (message, type) =>
        set({ notification: { message, type } }),
      clearNotification: () => set({ notification: null }),
    }),
    {
      name: 'warisanverse-ui',
      partialize: (state) => ({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
      }),
    }
  )
);
