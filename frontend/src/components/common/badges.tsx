import { Badge } from '@/components/ui/Badge';
import type { AnomalyStatus, Environment, Lifecycle, ResourceStatus, Severity } from '@/types/api';
import { cn } from '@/lib/utils';

const SEVERITY_MAP: Record<Severity, { variant: 'info' | 'warning' | 'danger'; label: string }> = {
  LOW: { variant: 'info', label: 'Low' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  HIGH: { variant: 'danger', label: 'High' },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY_MAP[severity];
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

const LIFECYCLE_MAP: Record<Lifecycle, { variant: 'healthy' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  ACTIVE: { variant: 'healthy', label: 'Active' },
  IDLE: { variant: 'warning', label: 'Idle' },
  FLAGGED: { variant: 'danger', label: 'Flagged' },
  REVIEWED: { variant: 'info', label: 'Reviewed' },
  ARCHIVED: { variant: 'neutral', label: 'Archived' },
};

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  const l = LIFECYCLE_MAP[lifecycle];
  return (
    <Badge variant={l.variant} dot>
      {l.label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ResourceStatus }) {
  return status === 'RUNNING' ? (
    <Badge variant="healthy" dot>
      Running
    </Badge>
  ) : (
    <Badge variant="neutral" dot>
      Stopped
    </Badge>
  );
}

const ANOMALY_STATUS_MAP: Record<AnomalyStatus, { variant: 'danger' | 'warning' | 'healthy'; label: string }> = {
  OPEN: { variant: 'danger', label: 'Open' },
  ACKNOWLEDGED: { variant: 'warning', label: 'Acknowledged' },
  RESOLVED: { variant: 'healthy', label: 'Resolved' },
};

export function AnomalyStatusBadge({ status }: { status: AnomalyStatus }) {
  const s = ANOMALY_STATUS_MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const ENV_STYLES: Record<Environment, string> = {
  PROD: 'bg-ink text-white',
  STAGING: 'bg-warning-bg text-warning',
  DEV: 'bg-panel text-muted border border-line',
};

export function EnvBadge({ environment }: { environment: Environment }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', ENV_STYLES[environment])}>
      {environment}
    </span>
  );
}
