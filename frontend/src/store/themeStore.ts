import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark;
        applyTheme(next);
        set({ dark: next });
      },
    }),
    {
      name: 'cloudguard-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.dark);
      },
    },
  ),
);
