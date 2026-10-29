import { Link } from 'react-router-dom';
import { Server, DollarSign, Activity, Clock, Plus, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageShell';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import { UtilizationChart } from '@/components/charts/UtilizationChart';
import { EnvironmentPie } from '@/components/charts/EnvironmentPie';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { LoadingState, ErrorState, Skeleton, EmptyState } from '@/components/common/states';
import { SeverityPill } from '@/components/common/badges';
import { useSummary, useCostTrend, useUtilization, useByEnvironment } from '@/hooks/useDashboard';
import { useAnomalies } from '@/hooks/useAnomalies';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { currencyCompact, currency, number, percent, relativeTime } from '@/lib/format';
import { can } from '@/lib/rbac';


export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const days = useUiStore((s) => s.windowDays);

  const summary = useSummary();
  const costTrend = useCostTrend(days);
  const utilization = useUtilization(days);
  const byEnv = useByEnvironment(days);
  const recentAnomalies = useAnomalies({ status: 'OPEN', pageSize: 5 });

  if (summary.isLoading) return <LoadingState label="Loading your command center…" />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={summary.refetch} />;

  const s = summary.data!;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Good day,
            <Badge variant="lime" size="md" className="px-3 py-1 text-lg font-bold">
              {user?.name ?? 'CloudGuard'}
            </Badge>
          </span>
        }
        subtitle="Here's what's happening across your cloud infrastructure."
        actions={
          can(user?.role, 'CREATE_RESOURCE') && (
            <Link
              to="/resources"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-panel"
            >
              <Plus className="h-4 w-4" /> Add Resource
            </Link>
          )
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Resources"
          value={number(s.totalResources)}
          icon={<Server className="h-4 w-4" />}
          footnote={`${percent(s.avgCpuLast30Days)} avg CPU`}
        />
        <StatCard
          label="Est. Monthly Cost"
          value={currency(s.estimatedMonthlyCost)}
          icon={<DollarSign className="h-4 w-4" />}
          footnote={`${currency(s.actualCostLast30Days)} actual (30d)`}
        />
        <StatCard
          label="Open Anomalies"
          value={number(s.openAnomalies)}
          icon={<Activity className="h-4 w-4" />}
          footnote={
            <span className="flex gap-2">
              {s.anomaliesBySeverity.HIGH ? (
                <Badge variant="danger" size="sm">
                  {s.anomaliesBySeverity.HIGH} High
                </Badge>
              ) : null}
              {s.anomaliesBySeverity.MEDIUM ? `${s.anomaliesBySeverity.MEDIUM} Medium` : null}
            </span>
          }
        />
        <StatCard
          label="Idle Resources"
          value={number(s.idleResources)}
          icon={<Clock className="h-4 w-4" />}
          footnote={`Save ${currencyCompact(s.potentialMonthlySaving)}/mo`}
        />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h3 className="font-display text-lg font-bold">Cost Trend</h3>
              <p className="text-sm text-muted">Daily cloud spend over the last {days} days</p>
            </div>
            {costTrend.data && (
              <div className="flex gap-6 text-right">
                <div>
                  <div className="eyebrow">Total</div>
                  <div className="font-mono text-sm font-semibold">
                    {currency(costTrend.data.total)}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">Avg / day</div>
                  <div className="font-mono text-sm font-semibold">
                    {currency(costTrend.data.avgPerDay)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <CardContent>
            {costTrend.isLoading ? (
              <Skeleton className="h-[240px]" />
            ) : costTrend.data ? (
              <CostTrendChart data={costTrend.data} />
            ) : (
              <EmptyState title="No cost data" description="Seed metrics on the backend to populate this." />
            )}
          </CardContent>
        </Card>

        {/* By environment */}
        <Card>
          <div className="p-5 pb-0">
            <h3 className="font-display text-lg font-bold">Environments</h3>
            <p className="text-sm text-muted">Cost & count by stage</p>
          </div>
          <CardContent>
            {byEnv.data?.data.length ? (
              <EnvironmentPie data={byEnv.data} />
            ) : (
              <Skeleton className="h-[180px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Utilization + recent anomalies */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h3 className="font-display text-lg font-bold">CPU Utilization</h3>
              <p className="text-sm text-muted">Resource distribution across CPU bands</p>
            </div>
            {utilization.data && (
              <Badge variant="healthy">Avg {percent(utilization.data.overallAvgCpu)}</Badge>
            )}
          </div>
          <CardContent>
            {utilization.isLoading ? (
              <Skeleton className="h-[240px]" />
            ) : utilization.data ? (
              <UtilizationChart data={utilization.data} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-5 pb-0">
            <h3 className="font-display text-lg font-bold">Recent Anomalies</h3>
            <Link to="/anomalies" className="text-sm font-medium text-muted hover:text-ink">
              View all
            </Link>
          </div>
          <CardContent className="space-y-2">
            {recentAnomalies.isLoading ? (
              <Skeleton className="h-40" />
            ) : recentAnomalies.data?.data.length ? (
              recentAnomalies.data.data.map((a) => (
                <Link
                  key={a.id}
                  to={`/resources/${a.resourceId}`}
                  className="flex items-center justify-between rounded-card border border-line p-3 transition-colors hover:bg-panel"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-medium">{a.resource.name}</div>
                    <div className="truncate text-xs text-muted">{a.message}</div>
                  </div>
                  <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                    <SeverityPill severity={a.severity} />
                    <span className="font-mono text-[10px] text-muted-2">
                      {relativeTime(a.detectedAt)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="All clear"
                description="No open anomalies right now."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecast */}
      <div className="mt-6">
        <ForecastChart days={days} />
      </div>
    </div>
  );
}
