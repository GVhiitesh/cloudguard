import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Lightweight modal — backdrop, Escape to close, scroll lock. No dependency. */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-lg rounded-panel bg-surface shadow-pop animate-fade-in',
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-line p-5">
            <div>
              {title && <h2 className="font-display text-lg font-bold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-panel">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Right-side slide-over, used by the Add Resource drawer in the design. */
export function Drawer({ open, onClose, title, description, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex h-full w-full max-w-md flex-col rounded-l-[28px] bg-surface shadow-pop animate-slide-in overflow-hidden',
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            {title && <h2 className="font-display text-lg font-bold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-panel">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
