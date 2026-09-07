import { Link } from 'react-router-dom';
import { Clock, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EnvBadge, LifecycleBadge } from '@/components/common/badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { useIdle, useApplyRecommendation } from '@/hooks/useAnomalies';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { currency, currencyCompact, percent, number } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';

export function Idle() {
  const role = useAuthStore((s) => s.user?.role);
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useIdle();
  const applyReco = useApplyRecommendation();

  async function apply(id: string) {
    try {
      await applyReco.mutateAsync({ id, input: {} });
      toast.success('Recommendation applied');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Idle Resources"
        subtitle="Provisioned and running, but doing little or no work."
        actions={
          data && (
            <Badge variant="warning" size="md" className="px-3 py-2 text-sm">
              {currencyCompact(data.totalWastedSpendPerMonth)}/mo wasted
            </Badge>
          )
        }
      />

      {!data?.data.length ? (
        <Card className="p-0">
          <EmptyState
            icon={TrendingDown}
            title="Nothing idle"
            description="Every running resource is pulling its weight right now."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((entry) => {
            const r = entry.resource;
            const ev = entry.evidence;
            const reco = entry.recommendations[0];
            return (
              <Card key={r.id}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/resources/${r.id}`}
                        className="font-display font-bold hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="ink" size="sm" className="font-mono">
                          {r.type}
                        </Badge>
                        <EnvBadge environment={r.environment} />
                        <LifecycleBadge lifecycle={r.lifecycle} />
                      </div>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-bg text-warning">
                      <Clock className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-card bg-panel p-3 text-center">
                    <Ev label="Avg CPU" value={percent(ev.avgCpu)} />
                    <Ev label="Idle days" value={ev.idleDays != null ? number(ev.idleDays) : '—'} />
                    <Ev label="Data pts" value={number(ev.dataPoints)} />
                  </div>

                  <div className="flex items-center justify-between rounded-card bg-warning-bg/50 px-3 py-2 text-sm">
                    <span className="text-muted">Wasted spend</span>
                    <span className="font-mono font-semibold text-warning">
                      {currency(entry.wastedSpendPerMonth)}/mo
                    </span>
                  </div>

                  {reco && can(role, 'APPLY_RECOMMENDATION') && (
                    <Button
                      variant="lime"
                      size="sm"
                      className="w-full"
                      loading={applyReco.isPending}
                      onClick={() => apply(reco.id)}
                    >
                      Apply: {String(reco.type)} · save {currency(reco.estSaving)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ev({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
