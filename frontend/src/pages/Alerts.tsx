import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useDashboard';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const KIND_VARIANT: Record<string, 'danger' | 'warning' | 'lime' | 'info' | 'neutral'> = {
  ANOMALY: 'danger',
  IDLE: 'warning',
  BUDGET: 'info',
  RECOMMENDATION: 'lime',
};

export function Alerts() {
  const { data, isLoading, isError, error, refetch } = useAlerts();
  const markRead = useMarkAlertRead();
  const markAll = useMarkAllAlertsRead();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Notifications from the detection engine and budget monitors."
        actions={
          (data?.unread ?? 0) > 0 && (
            <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )
        }
      />

      {!data?.data.length ? (
        <Card className="p-0">
          <EmptyState icon={BellOff} title="No alerts" description="You're all caught up." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {data.data.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-4 border-b border-line p-4 last:border-0',
                !alert.read && 'bg-panel/60',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  alert.read ? 'bg-panel text-muted-2' : 'bg-ink text-lime',
                )}
              >
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={KIND_VARIANT[alert.kind] ?? 'neutral'} size="sm">
                    {alert.kind}
                  </Badge>
                  {!alert.read && <span className="h-2 w-2 rounded-full bg-lime" />}
                </div>
                <p className="mt-1 text-sm text-ink">{alert.message}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-2">
                  {relativeTime(alert.createdAt)}
                </p>
              </div>
              {!alert.read && (
                <button
                  onClick={() => markRead.mutate(alert.id)}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
