import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/api/client';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Skeleton block for card and table placeholders. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-panel ${className}`} />;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: typeof Inbox;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-panel p-4">
        <Icon className="h-6 w-6 text-muted-2" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-danger-bg p-4">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-ink">Something went wrong</h3>
        <p className="mt-1 max-w-md text-sm text-muted">{apiErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}
