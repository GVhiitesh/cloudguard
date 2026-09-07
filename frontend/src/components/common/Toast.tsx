import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const push = useContext(ToastContext);
  return {
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  };
}

const ICON = { success: CheckCircle2, error: XCircle, info: Info };
const STYLE: Record<ToastKind, string> = {
  success: 'text-healthy-deep',
  error: 'text-danger',
  info: 'text-info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop animate-fade-in"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', STYLE[t.kind])} />
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="text-muted-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
