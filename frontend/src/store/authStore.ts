import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, User } from '@/types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  role: () => Role | null;
}

/**
 * Auth lives in localStorage so a refresh does not bounce the user to /login.
 * The token is the only credential the app holds; `logout` is also what the
 * axios 401 interceptor calls.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => Boolean(get().token),
      role: () => get().user?.role ?? null,
    }),
    { name: 'cloudguard-auth' },
  ),
);
