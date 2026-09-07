import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  createdAt: number;
}

interface NotificationState {
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (t) => {
    const id = `toast-${++counter}`;
    const toast: Toast = { ...t, id, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
