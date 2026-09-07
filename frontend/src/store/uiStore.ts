import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  /** Trailing window used by the dashboard charts and the twin history. */
  windowDays: number;
  setWindowDays: (days: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      windowDays: 30,
      setWindowDays: (windowDays) => set({ windowDays }),
    }),
    { name: 'cloudguard-ui' },
  ),
);
