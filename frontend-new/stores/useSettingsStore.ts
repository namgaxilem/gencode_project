'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Density = 'comfortable' | 'compact';

type SettingsState = {
  // Appearance
  darkMode: boolean;
  sidebarExpanded: boolean;
  density: Density;

  // Workspace
  language: 'en' | 'vi';

  // Notifications
  notifEmail: boolean;
  notifDesktop: boolean;
  notifSound: boolean;

  // AI defaults (example)
  aiModel: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
  temperature: number; // 0..1

  // actions
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
};

const DEFAULTS: Omit<SettingsState, 'set' | 'reset'> = {
  darkMode: true,
  sidebarExpanded: true,
  density: 'comfortable',
  language: 'en',
  notifEmail: true,
  notifDesktop: true,
  notifSound: false,
  aiModel: 'gpt-4o-mini',
  temperature: 0.2,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as any),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'app-settings' }
  )
);
