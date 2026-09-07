import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Check, X, ScanSearch } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { SeverityPill, AnomalyStatusBadge } from '@/components/common/badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { useAnomalies, useUpdateAnomalyStatus } from '@/hooks/useAnomalies';
import { useRunDetection } from '@/hooks/useDashboard';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { downloadCsv } from '@/api/simulator';
import { downloadBlob, currency, number, relativeTime } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';
import { SEVERITIES } from '@/types/api';
import type { AnomalyFilters, AnomalyStatus } from '@/types/api';

const STATUSES: AnomalyStatus[] = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

export function Anomalies() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const toast = useToast();
  const [filters, setFilters] = useState<AnomalyFilters>({ page: 1, pageSize: 50 });

  const { data, isLoading, isError, error, refetch } = useAnomalies(filters);
  const update = useUpdateAnomalyStatus();
  const detect = useRunDetection();
  const isAdmin = can(role, 'RUN_SIMULATOR');

  async function runScan() {
    try {
      await detect.mutateAsync();
      toast.success('Anomaly scan complete');
      refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function patch(f: Partial<AnomalyFilters>) {
    setFilters((prev) => ({ ...prev, ...f, page: 1 }));
  }

  async function setStatus(id: string, status: AnomalyStatus) {
    try {
      await update.mutateAsync({ id, status });
      toast.success(`Anomaly ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function exportCsv() {
    try {
      downloadBlob(await downloadCsv('anomalies'), 'cloudguard-anomalies.csv');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Anomalies"
        subtitle="Incident center — cost and usage spikes detected across your fleet."
        actions={
          <>
            {isAdmin && (
              <Button variant="lime" onClick={runScan} loading={detect.isPending}>
                <ScanSearch className="h-4 w-4" /> Run Anomaly Scan
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <Select onChange={(e) => patch({ status: (e.target.value || undefined) as never })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select onChange={(e) => patch({ severity: (e.target.value || undefined) as never })}>
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select onChange={(e) => patch({ kind: (e.target.value || undefined) as never })}>
            <option value="">All kinds</option>
            <option value="COST_SPIKE">Cost spike</option>
            <option value="USAGE_SPIKE">Usage spike</option>
            <option value="IDLE">Idle</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.data.length ? (
        <Card className="p-0">
          <EmptyState
            icon={Check}
            title="No anomalies"
            description="Nothing matches these filters. Your fleet is quiet."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Resource', 'Kind', 'Severity', 'Expected → Actual', 'Deviation', 'Status', 'Detected', ''].map(
                    (h) => (
                      <th key={h} className="eyebrow px-4 py-3 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.data.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-line last:border-0 hover:bg-panel"
                  >
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => navigate(`/resources/${a.resourceId}`)}
                    >
                      <div className="font-medium">{a.resource.name}</div>
                      <div className="max-w-xs truncate text-xs text-muted">{a.message}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{a.kind.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <SeverityPill severity={a.severity} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {currency(a.expected)} → <span className="font-semibold">{currency(a.actual)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{number(a.deviation, 2)}</td>
                    <td className="px-4 py-3">
                      <AnomalyStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{relativeTime(a.detectedAt)}</td>
                    <td className="px-4 py-3">
                      {can(role, 'UPDATE_ANOMALY') && a.status !== 'RESOLVED' && (
                        <div className="flex justify-end gap-1">
                          {a.status === 'OPEN' && (
                            <button
                              title="Acknowledge"
                              onClick={() => setStatus(a.id, 'ACKNOWLEDGED')}
                              className="rounded-full p-2 text-muted hover:bg-warning-bg hover:text-warning"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            title="Resolve"
                            onClick={() => setStatus(a.id, 'RESOLVED')}
                            className="rounded-full p-2 text-muted hover:bg-healthy-bg hover:text-healthy-deep"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
