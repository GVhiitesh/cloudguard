import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Cpu, Wallet, HeartPulse, Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { HealthGauge } from '@/components/common/HealthGauge';
import { HistoryChart } from '@/components/charts/HistoryChart';
import { LifecycleStrip } from '@/components/twin/LifecycleStrip';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { LifecycleBadge, StatusBadge, EnvBadge, SeverityPill, AnomalyStatusBadge } from '@/components/common/badges';
import { useTwin, useChangeLifecycle } from '@/hooks/useResources';
import { useUpdateAnomalyStatus, useApplyRecommendation } from '@/hooks/useAnomalies';
import { useToast } from '@/components/common/Toast';
import { apiErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/rbac';
import { currency, percent, number, relativeTime } from '@/lib/format';
import type { Lifecycle } from '@/types/api';

const WINDOWS = [7, 14, 30, 90];

export function ResourceTwin() {
  const { id } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);

  const { data: twin, isLoading, isError, error, refetch } = useTwin(id, days);
  const changeLifecycle = useChangeLifecycle();
  const updateAnomaly = useUpdateAnomalyStatus();
  const applyReco = useApplyRecommendation();

  if (isLoading) return <LoadingState label="Assembling digital twin…" />;
  if (isError || !twin) return <ErrorState error={error} onRetry={refetch} />;

  const r = twin.resource;
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const openAnomalies = twin.anomalies.filter((a) => a.status === 'OPEN');
  const topAnomaly = openAnomalies[0];
  const topReco = twin.recommendations[0];

  async function advanceLifecycle(to: Lifecycle) {
    setLifecycleOpen(false);
    try {
      await changeLifecycle.mutateAsync({ id: id!, to });
      toast.success(`Lifecycle moved to ${to}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function setAnomaly(anomalyId: string, status: 'ACKNOWLEDGED' | 'RESOLVED') {
    try {
      await updateAnomaly.mutateAsync({ id: anomalyId, status });
      toast.success(`Anomaly ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function apply(recoId: string) {
    try {
      await applyReco.mutateAsync({ id: recoId, input: {} });
      toast.success('Recommendation applied');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Link to="/resources" className="flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Resources
            </Link>
            <span className="eyebrow">Digital Twin · Real-time Telemetry</span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold">{r.name}</h1>
                <Badge variant="neutral" className="font-mono">
                  {r.id.slice(0, 12)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="ink" className="font-mono">
                  {r.type} · {r.provider}
                </Badge>
                <EnvBadge environment={r.environment} />
                <Badge variant="neutral" className="font-mono">
                  {r.region}
                </Badge>
                <StatusBadge status={r.status} />
                <LifecycleBadge lifecycle={r.lifecycle} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-panel border border-line px-4 py-2">
                <HealthGauge score={twin.healthScore} />
                <div>
                  <div className="font-display font-bold text-healthy-deep">
                    {twin.healthScore >= 80 ? 'Healthy' : twin.healthScore >= 50 ? 'Warning' : 'Critical'}
                  </div>
                  <div className="text-xs text-muted">Score {twin.healthScore}/100</div>
                </div>
              </div>
              {can(role, 'CHANGE_LIFECYCLE') && (
                <div className="relative">
                  <Button variant="primary" onClick={() => setLifecycleOpen((o) => !o)}>
                    Lifecycle <ChevronDown className="h-4 w-4" />
                  </Button>
                  {lifecycleOpen && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-card border border-line bg-surface p-1 shadow-pop">
                      {twin.allowedNext.length ? (
                        twin.allowedNext.map((to) => (
                          <button
                            key={to}
                            onClick={() => advanceLifecycle(to)}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-panel"
                          >
                            Move to {to}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted">No transitions available</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <LifecycleStrip current={r.lifecycle} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column — metrics, history, specs, tags */}
        <div className="space-y-4 lg:col-span-2">
          {/* Usage tiles */}
          <div className="grid grid-cols-3 gap-4">
            <TwinTile icon={<Cpu className="h-4 w-4" />} label="Avg CPU" value={percent(twin.usageSummary.avgCpu)} sub={`${number(twin.usageSummary.dataPoints)} points`} />
            <TwinTile icon={<Wallet className="h-4 w-4" />} label="Avg Cost" value={`${currency(twin.usageSummary.avgCost)}/day`} sub={`${twin.usageSummary.trend} trend`} />
            <TwinTile icon={<HeartPulse className="h-4 w-4" />} label="Projected" value={currency(twin.usageSummary.projectedMonthlyCost)} sub="per month" />
          </div>

          {/* History chart */}
          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <div>
                <h3 className="font-display text-lg font-bold">Usage & Cost History</h3>
                <p className="text-sm text-muted">Dual-curve telemetry over {days} days</p>
              </div>
              <div className="flex gap-1 rounded-full bg-panel p-1">
                {WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setDays(w)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${days === w ? 'bg-surface shadow-card' : 'text-muted'}`}
                  >
                    {w}D
                  </button>
                ))}
              </div>
            </div>
            <CardContent>
              {twin.history.length ? (
                <HistoryChart history={twin.history} anomalies={twin.anomalies} />
              ) : (
                <EmptyState title="No history" description="Seed metrics on the backend to populate this chart." />
              )}
            </CardContent>
          </Card>

          {/* Specs */}
          {Object.keys(meta).length > 0 && (
            <Card>
              <div className="p-5 pb-0">
                <h3 className="eyebrow">Hardware & Network Specs</h3>
              </div>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(meta).map(([k, v]) => (
                  <div key={k} className="rounded-card border border-line p-3">
                    <div className="eyebrow">{k}</div>
                    <div className="mt-1 font-mono text-sm font-semibold">{String(v)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow pr-2">Tags:</span>
                {twin.tags.length ? (
                  twin.tags.map((t) => (
                    <Badge key={t.id} variant="neutral" className="font-mono">
                      {t.key}:{t.value}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted">No tags</span>
                )}
                {can(role, 'UPDATE_RESOURCE') && (
                  <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted hover:text-ink">
                    <Plus className="h-3 w-3" /> Add Tag
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — detected issues + recommendations */}
        <div className="space-y-4">
          {topAnomaly && (
            <Card className="border-danger/30">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-display font-bold">
                    <span className="h-2 w-2 rounded-full bg-danger" /> Detected Issues
                  </span>
                  <SeverityPill severity={topAnomaly.severity} />
                </div>
                <div>
                  <h4 className="font-display text-xl font-bold text-danger">
                    {topAnomaly.kind.replace('_', ' ')}
                  </h4>
                  <p className="mt-1 text-sm text-muted">{topAnomaly.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-card bg-danger-bg/40 p-3">
                  <Metric label="Expected" value={currency(topAnomaly.expected)} />
                  <Metric label="Actual" value={currency(topAnomaly.actual)} accent />
                  <Metric label="Deviation" value={number(topAnomaly.deviation, 2)} accent />
                  <Metric label="Detected" value={relativeTime(topAnomaly.detectedAt)} />
                </div>
                {can(role, 'UPDATE_ANOMALY') && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAnomaly(topAnomaly.id, 'ACKNOWLEDGED')}>
                      Acknowledge
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => setAnomaly(topAnomaly.id, 'RESOLVED')}>
                      Resolve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {topReco && (
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">Optimization</h3>
                  <Badge variant="lime" className="font-mono">
                    {String(topReco.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted">{topReco.reason}</p>
                <div className="rounded-card bg-lime p-4">
                  <div className="eyebrow text-ink/60">Estimated Saving</div>
                  <div className="mt-1 font-display text-2xl font-bold">
                    {currency(topReco.estSaving)} <span className="text-sm font-medium">/ month</span>
                  </div>
                </div>
                {can(role, 'APPLY_RECOMMENDATION') && (
                  <Button variant="lime" className="w-full" loading={applyReco.isPending} onClick={() => apply(topReco.id)}>
                    Apply Recommendation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!topAnomaly && !topReco && (
            <Card>
              <CardContent>
                <EmptyState icon={TrendingUp} title="All clear" description="No open issues or pending recommendations for this resource." />
              </CardContent>
            </Card>
          )}

          {/* Health breakdown */}
          {twin.healthBreakdown.length > 0 && (
            <Card>
              <div className="p-5 pb-0">
                <h3 className="eyebrow">Health Breakdown</h3>
              </div>
              <CardContent className="space-y-2">
                {twin.healthBreakdown.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{d.reason}</span>
                    <span className="font-mono font-semibold text-danger">{d.delta}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Full anomaly list */}
      {twin.anomalies.length > 1 && (
        <Card>
          <div className="p-5 pb-0">
            <h3 className="font-display text-lg font-bold">All Anomalies</h3>
          </div>
          <CardContent className="space-y-2">
            {twin.anomalies.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-card border border-line p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{a.kind.replace('_', ' ')}</span>
                    <SeverityPill severity={a.severity} />
                    <AnomalyStatusBadge status={a.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{a.message}</div>
                </div>
                <span className="font-mono text-xs text-muted-2">{relativeTime(a.detectedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TwinTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{label}</span>
          <span className="text-muted-2">{icon}</span>
        </div>
        <div className="font-display text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${accent ? 'text-danger' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}
