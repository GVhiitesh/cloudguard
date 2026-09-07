import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { mean, round } from '../../lib/stats';

/**
 * Resources currently sitting in the IDLE (or FLAGGED-from-idle) lifecycle,
 * returned with the evidence that put them there.
 */
export async function listIdle() {
  const resources = await prisma.resource.findMany({
    where: { lifecycle: { in: ['IDLE', 'FLAGGED'] } },
    include: {
      tags: true,
      owner: { select: { id: true, name: true, email: true } },
      recommendations: { where: { applied: false } },
    },
    orderBy: { idleSince: 'asc' },
  });

  const windowStart = new Date(Date.now() - env.IDLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const data = await Promise.all(
    resources.map(async (resource) => {
      const metrics = await prisma.usageMetric.findMany({
        where: { resourceId: resource.id, timestamp: { gte: windowStart } },
        orderBy: { timestamp: 'asc' },
      });

      const avgCpu = mean(metrics.map((m) => m.cpu));
      const idleDays = resource.idleSince
        ? Math.floor((Date.now() - resource.idleSince.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      return {
        resource: {
          id: resource.id,
          name: resource.name,
          type: resource.type,
          environment: resource.environment,
          region: resource.region,
          status: resource.status,
          lifecycle: resource.lifecycle,
          estCostPerDay: resource.estCostPerDay,
          healthScore: resource.healthScore,
          owner: resource.owner,
          tags: resource.tags,
        },
        evidence: {
          windowDays: env.IDLE_WINDOW_DAYS,
          cpuThreshold: env.IDLE_CPU_THRESHOLD,
          dataPoints: metrics.length,
          avgCpu: round(avgCpu),
          maxCpu: round(metrics.length ? Math.max(...metrics.map((m) => m.cpu)) : 0),
          avgCost: round(mean(metrics.map((m) => m.cost))),
          idleSince: resource.idleSince,
          idleDays,
          stillRunning: resource.status === 'RUNNING',
        },
        wastedSpendPerMonth: round(resource.estCostPerDay * 30),
        recommendations: resource.recommendations,
      };
    }),
  );

  return {
    count: data.length,
    totalWastedSpendPerMonth: round(data.reduce((a, d) => a + d.wastedSpendPerMonth, 0)),
    data,
  };
}
