"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: true, // default true
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (value) => set({ darkMode: value }),
    }),
    {
      name: "theme-storage", // key in localStorage
    }
  )
);
