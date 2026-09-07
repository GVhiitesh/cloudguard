import { prisma } from '../../config/db';
import { mean, round, trend } from '../../lib/stats';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/** Headline numbers for the dashboard hero row. */
export async function summary() {
  const from30 = daysAgo(30);

  const [
    totalResources,
    byLifecycle,
    byStatus,
    openAnomalies,
    anomaliesBySeverity,
    idleCount,
    costAgg,
    estCostAgg,
    savingsAgg,
    unappliedRecs,
  ] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.groupBy({
      by: ['lifecycle'],
      _count: { _all: true },
      orderBy: { lifecycle: 'asc' },
    }),
    prisma.resource.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    }),
    prisma.anomaly.count({ where: { status: 'OPEN' } }),
    prisma.anomaly.groupBy({
      by: ['severity'],
      where: { status: 'OPEN' },
      _count: { _all: true },
      orderBy: { severity: 'asc' },
    }),
    prisma.resource.count({ where: { lifecycle: 'IDLE' } }),
    prisma.usageMetric.aggregate({
      where: { timestamp: { gte: from30 } },
      _sum: { cost: true },
      _avg: { cpu: true },
    }),
    prisma.resource.aggregate({ _sum: { estCostPerDay: true }, _avg: { healthScore: true } }),
    prisma.recommendation.aggregate({ where: { applied: false }, _sum: { estSaving: true } }),
    prisma.recommendation.count({ where: { applied: false } }),
  ]);

  const cost30 = costAgg._sum.cost ?? 0;

  return {
    totalResources,
    resourcesByLifecycle: Object.fromEntries(
      byLifecycle.map((r) => [r.lifecycle, r._count._all]),
    ),
    resourcesByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    openAnomalies,
    anomaliesBySeverity: Object.fromEntries(
      anomaliesBySeverity.map((r) => [r.severity, r._count._all]),
    ),
    idleResources: idleCount,
    /** Actual metered spend over the trailing 30 days. */
    actualCostLast30Days: round(cost30),
    /** Forward-looking estimate from the resources' own per-day estimates. */
    estimatedMonthlyCost: round((estCostAgg._sum.estCostPerDay ?? 0) * 30),
    avgCpuLast30Days: round(costAgg._avg.cpu ?? 0),
    avgHealthScore: round(estCostAgg._avg.healthScore ?? 0),
    potentialMonthlySaving: round(savingsAgg._sum.estSaving ?? 0),
    openRecommendations: unappliedRecs,
  };
}

/** Daily total cost time series, gap-filled so the chart has no holes. */
export async function costTrend(days: number) {
  const from = daysAgo(days);
  const rows = await prisma.usageMetric.findMany({
    where: { timestamp: { gte: from } },
    select: { timestamp: true, cost: true },
    orderBy: { timestamp: 'asc' },
  });

  const byDay = new Map<number, number>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    d.setUTCHours(0, 0, 0, 0);
    byDay.set(d.getTime(), (byDay.get(d.getTime()) ?? 0) + r.cost);
  }

  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const series: Array<{ date: string; cost: number }> = [];
  for (let i = 0; i <= days; i++) {
    const key = start.getTime() + i * DAY_MS;
    if (key > Date.now()) break;
    series.push({
      date: new Date(key).toISOString().slice(0, 10),
      cost: round(byDay.get(key) ?? 0),
    });
  }

  const values = series.map((s) => s.cost);
  return {
    days,
    series,
    total: round(values.reduce((a, b) => a + b, 0)),
    avgPerDay: round(mean(values)),
    trend: trend(values),
  };
}

const CPU_BUCKETS = [
  { label: '0-5%', min: 0, max: 5 },
  { label: '5-20%', min: 5, max: 20 },
  { label: '20-50%', min: 20, max: 50 },
  { label: '50-80%', min: 50, max: 80 },
  { label: '80-100%', min: 80, max: 100.01 },
] as const;

/** Distribution of resources across average-CPU bands. */
export async function utilization(days = 30) {
  const from = daysAgo(days);

  const grouped = await prisma.usageMetric.groupBy({
    by: ['resourceId'],
    where: { timestamp: { gte: from } },
    _avg: { cpu: true, memory: true },
    orderBy: { resourceId: 'asc' },
  });

  const resources = await prisma.resource.findMany({
    select: { id: true, name: true, type: true, environment: true, estCostPerDay: true },
  });
  const byId = new Map(resources.map((r) => [r.id, r]));

  const buckets = CPU_BUCKETS.map((b) => ({
    label: b.label,
    count: 0,
    resources: [] as Array<{ id: string; name: string; avgCpu: number }>,
  }));

  for (const g of grouped) {
    const avgCpu = g._avg.cpu ?? 0;
    const idx = CPU_BUCKETS.findIndex((b) => avgCpu >= b.min && avgCpu < b.max);
    if (idx === -1) continue;
    const resource = byId.get(g.resourceId);
    buckets[idx].count += 1;
    buckets[idx].resources.push({
      id: g.resourceId,
      name: resource?.name ?? g.resourceId,
      avgCpu: round(avgCpu),
    });
  }

  // Resources with no metrics in the window are not in any bucket; report them.
  const withMetrics = new Set(grouped.map((g) => g.resourceId));

  return {
    windowDays: days,
    buckets,
    resourcesWithoutData: resources.filter((r) => !withMetrics.has(r.id)).length,
    overallAvgCpu: round(mean(grouped.map((g) => g._avg.cpu ?? 0))),
    overallAvgMemory: round(mean(grouped.map((g) => g._avg.memory ?? 0))),
  };
}

/** Cost forecast — uses trailing daily costs to project the next N days. */
export async function costForecast(historyDays = 30, forecastDays = 30) {
  const from = daysAgo(historyDays);
  const rows = await prisma.usageMetric.findMany({
    where: { timestamp: { gte: from } },
    select: { timestamp: true, cost: true },
    orderBy: { timestamp: 'asc' },
  });

  const byDay = new Map<number, number>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    d.setUTCHours(0, 0, 0, 0);
    byDay.set(d.getTime(), (byDay.get(d.getTime()) ?? 0) + r.cost);
  }

  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const historySeries: Array<{ date: string; cost: number }> = [];
  for (let i = 0; i <= historyDays; i++) {
    const key = start.getTime() + i * DAY_MS;
    if (key > Date.now()) break;
    historySeries.push({ date: new Date(key).toISOString().slice(0, 10), cost: round(byDay.get(key) ?? 0) });
  }

  const values = historySeries.map((s) => s.cost);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const t = trend(values);
  const slopePerDay = values.length > 1 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;

  const forecastSeries: Array<{ date: string; cost: number }> = [];
  const lastDate = historySeries.length > 0 ? new Date(historySeries[historySeries.length - 1].date).getTime() : Date.now();
  for (let i = 1; i <= forecastDays; i++) {
    const projected = Math.max(0, avg + slopePerDay * (values.length + i - 1));
    forecastSeries.push({
      date: new Date(lastDate + i * DAY_MS).toISOString().slice(0, 10),
      cost: round(projected),
    });
  }

  const forecastTotal = round(forecastSeries.reduce((a, b) => a + b.cost, 0));
  const historyTotal = round(values.reduce((a, b) => a + b, 0));

  return {
    historyDays,
    forecastDays,
    historySeries,
    forecastSeries,
    historyTotal,
    forecastTotal,
    avgPerDay: round(avg),
    trend: t,
  };
}

/** Cost and resource count grouped by environment. */
export async function byEnvironment(days = 30) {
  const from = daysAgo(days);

  const [counts, metrics] = await Promise.all([
    prisma.resource.groupBy({
      by: ['environment'],
      _count: { _all: true },
      _sum: { estCostPerDay: true },
      _avg: { healthScore: true },
      orderBy: { environment: 'asc' },
    }),
    prisma.usageMetric.findMany({
      where: { timestamp: { gte: from } },
      select: { cost: true, cpu: true, resource: { select: { environment: true } } },
    }),
  ]);

  const actual = new Map<string, { cost: number; cpu: number[] }>();
  for (const m of metrics) {
    const key = m.resource.environment;
    const entry = actual.get(key) ?? { cost: 0, cpu: [] };
    entry.cost += m.cost;
    entry.cpu.push(m.cpu);
    actual.set(key, entry);
  }

  return {
    windowDays: days,
    data: counts.map((c) => {
      const a = actual.get(c.environment);
      return {
        environment: c.environment,
        resourceCount: c._count._all,
        actualCost: round(a?.cost ?? 0),
        estimatedMonthlyCost: round((c._sum.estCostPerDay ?? 0) * 30),
        avgCpu: round(mean(a?.cpu ?? [])),
        avgHealthScore: round(c._avg.healthScore ?? 0),
      };
    }),
  };
}
