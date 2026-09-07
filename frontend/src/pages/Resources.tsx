import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { LifecycleBadge, StatusBadge, EnvBadge } from '@/components/common/badges';
import { HealthGauge } from '@/components/common/HealthGauge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useResources, useDeleteResource } from '@/hooks/useResources';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { downloadCsv } from '@/api/simulator';
import { downloadBlob, currency, number } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';
import { RESOURCE_TYPES, ENVIRONMENTS, LIFECYCLES } from '@/types/api';
import type { Resource, ResourceFilters } from '@/types/api';

export function Resources() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const toast = useToast();

  const [filters, setFilters] = useState<ResourceFilters>({ page: 1, pageSize: 25 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | undefined>();
  const [deleting, setDeleting] = useState<Resource | undefined>();

  const { data, isLoading, isError, error, refetch } = useResources(filters);
  const del = useDeleteResource();

  function patch(f: Partial<ResourceFilters>) {
    setFilters((prev) => ({ ...prev, ...f, page: 1 }));
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success('Resource deleted');
      setDeleting(undefined);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function exportCsv() {
    try {
      const blob = await downloadCsv('resources');
      downloadBlob(blob, 'cloudguard-resources.csv');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Your cloud inventory across every environment."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
            {can(role, 'CREATE_RESOURCE') && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Resource
              </Button>
            )}
          </div>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              placeholder="Search by name…"
              onChange={(e) => patch({ q: e.target.value || undefined })}
              className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm focus:border-ink/30 focus:outline-none"
            />
          </div>
          <Select onChange={(e) => patch({ type: (e.target.value || undefined) as never })}>
            <option value="">All types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select onChange={(e) => patch({ environment: (e.target.value || undefined) as never })}>
            <option value="">All environments</option>
            {ENVIRONMENTS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
          <Select onChange={(e) => patch({ lifecycle: (e.target.value || undefined) as never })}>
            <option value="">All lifecycles</option>
            {LIFECYCLES.map((l) => (
              <option key={l}>{l}</option>
            ))}
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
            title="No resources found"
            description="Adjust your filters, or add your first resource."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Resource', 'Type', 'Env', 'Owner', 'Status', 'Lifecycle', 'Health', 'Cost/day', ''].map(
                    (h) => (
                      <th key={h} className="eyebrow px-4 py-3 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/resources/${r.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-panel"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-xs text-muted-2">{r.region}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.type}</td>
                    <td className="px-4 py-3">
                      <EnvBadge environment={r.environment} />
                    </td>
                    <td className="px-4 py-3 text-muted">{r.owner?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <LifecycleBadge lifecycle={r.lifecycle} />
                    </td>
                    <td className="px-4 py-3">
                      <HealthGauge score={r.healthScore} size={36} />
                    </td>
                    <td className="px-4 py-3 font-mono">{currency(r.estCostPerDay)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {can(role, 'UPDATE_RESOURCE') && (
                          <button
                            onClick={() => {
                              setEditing(r);
                              setFormOpen(true);
                            }}
                            className="rounded-full p-2 text-muted hover:bg-panel-2 hover:text-ink"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {can(role, 'DELETE_RESOURCE') && (
                          <button
                            onClick={() => setDeleting(r)}
                            className="rounded-full p-2 text-muted hover:bg-danger-bg hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
            <span>
              {number(data.pagination.total)} resources · page {data.pagination.page}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(filters.page ?? 1) * (filters.pageSize ?? 25) >= data.pagination.total}
                onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ResourceForm open={formOpen} onClose={() => setFormOpen(false)} resource={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={confirmDelete}
        title="Delete resource?"
        description={`This permanently removes "${deleting?.name}" and all of its metrics, anomalies and recommendations. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={del.isPending}
      />
    </div>
  );
}
