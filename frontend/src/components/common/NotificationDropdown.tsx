import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Activity, DollarSign, Server, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useDashboard';

const KIND_ICON: Record<string, React.ReactNode> = {
  ANOMALY_DETECTED: <Activity className="h-4 w-4 text-danger" />,
  BUDGET_EXCEEDED: <DollarSign className="h-4 w-4 text-warning" />,
  RESOURCE_UNHEALTHY: <Server className="h-4 w-4 text-danger" />,
  IDLE_DETECTED: <AlertTriangle className="h-4 w-4 text-warning" />,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: alertData } = useAlerts({});
  const { data: unreadData } = useAlerts({ read: false });
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  const unread = unreadData?.unread ?? 0;
  const alerts = alertData?.data ?? [];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full border border-line bg-surface p-2.5 hover:bg-panel"
      >
        <Bell className="h-5 w-5 text-ink" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-96 rounded-xl2 border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-lime hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">No notifications yet</div>
            ) : (
              alerts.slice(0, 10).map((alert: any) => (
                <button
                  key={alert.id}
                  onClick={() => {
                    if (!alert.read) markRead.mutate(alert.id);
                    setOpen(false);
                    navigate('/alerts');
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-panel',
                    !alert.read && 'bg-lime/5',
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {KIND_ICON[alert.kind] ?? <Bell className="h-4 w-4 text-muted-2" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-sm', !alert.read ? 'font-semibold text-ink' : 'text-ink')}>
                      {alert.message}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-2">{timeAgo(alert.createdAt)}</div>
                  </div>
                  {!alert.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-lime" />}
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => { setOpen(false); navigate('/alerts'); }}
            className="w-full border-t border-line px-4 py-2.5 text-center text-xs font-medium text-lime hover:bg-panel"
          >
            View all alerts
          </button>
        </div>
      )}
    </div>
  );
}
