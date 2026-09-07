import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore, type Toast } from '@/store/notificationStore';

const ICONS: Record<Toast['type'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-info" />,
  success: <CheckCircle className="h-4 w-4 text-healthy" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  error: <AlertOctagon className="h-4 w-4 text-danger" />,
};

const BG: Record<Toast['type'], string> = {
  info: 'border-info/30',
  success: 'border-healthy/30',
  warning: 'border-warning/30',
  error: 'border-danger/30',
};

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismiss = useNotificationStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-card border-l-4 bg-surface px-4 py-3 shadow-pop animate-slide-in',
            BG[t.type],
          )}
          style={{ minWidth: 320, maxWidth: 420 }}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">{t.title}</div>
            {t.message && <div className="mt-0.5 text-xs text-muted">{t.message}</div>}
          </div>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-muted-2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
