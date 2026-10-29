import { prisma } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { mean, round } from '../lib/stats';
import { systemTransition, SYSTEM_ACTOR } from './lifecycleOps';
import { writeAudit } from '../lib/audit';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IdleResult {
  scannedResources: number;
  markedIdle: number;
  recovered: number;
  escalatedToFlagged: number;
  recommendationsCreated: number;
  durationMs: number;
}

/**
 * A resource is idle when average CPU over the trailing window sits below the
 * threshold AND it is still RUNNING — a STOPPED resource is not wasting money,
 * so flagging it would be noise.
 */
export async function detectIdle(): Promise<IdleResult> {
  const startedAt = Date.now();
  const windowStart = new Date(Date.now() - env.IDLE_WINDOW_DAYS * DAY_MS);

  const resources = await prisma.resource.findMany({
    where: { lifecycle: { notIn: ['ARCHIVED', 'REVIEWED'] } },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      lifecycle: true,
      idleSince: true,
      ownerId: true,
      estCostPerDay: true,
    },
  });

  let markedIdle = 0;
  let recovered = 0;
  let escalatedToFlagged = 0;
  let recommendationsCreated = 0;

  for (const resource of resources) {
    const metrics = await prisma.usageMetric.findMany({
      where: { resourceId: resource.id, timestamp: { gte: windowStart } },
      select: { cpu: true, networkIn: true, networkOut: true },
    });

    // Without enough history we cannot claim idleness either way.
    if (metrics.length < Math.max(3, Math.floor(env.IDLE_WINDOW_DAYS / 2))) continue;

    const avgCpu = mean(metrics.map((m) => m.cpu));
    const avgNetwork = mean(metrics.map((m) => m.networkIn + m.networkOut));

    // Network activity is the tie-breaker: a low-CPU box still serving traffic
    // is not idle. The 1 MB/interval floor keeps background chatter from counting.
    const looksIdle =
      resource.status === 'RUNNING' && avgCpu < env.IDLE_CPU_THRESHOLD && avgNetwork < 1;

    if (!looksIdle) {
      if (resource.lifecycle === 'IDLE') {
        const moved = await prisma.$transaction((tx) =>
          systemTransition(tx, resource, 'ACTIVE', `Utilization recovered (avg CPU ${round(avgCpu)}%)`),
        );
        if (moved) recovered++;
      }
      continue;
    }

    const idleDays = resource.idleSince
      ? Math.floor((Date.now() - resource.idleSince.getTime()) / DAY_MS)
      : 0;

    // Idle long enough that a human should look at it.
    if (resource.lifecycle === 'IDLE' && idleDays >= env.IDLE_FLAG_AFTER_DAYS) {
      const moved = await prisma.$transaction((tx) =>
        systemTransition(tx, resource, 'FLAGGED', `Idle for ${idleDays} consecutive days`),
      );
      if (moved) escalatedToFlagged++;
      continue;
    }

    if (resource.lifecycle !== 'ACTIVE') continue;

    const message =
      `Average CPU of ${round(avgCpu)}% over the last ${env.IDLE_WINDOW_DAYS} days is below ` +
      `the ${env.IDLE_CPU_THRESHOLD}% idle threshold while the resource is still RUNNING.`;

    await prisma.$transaction(async (tx) => {
      const moved = await systemTransition(tx, resource, 'IDLE', message);
      if (!moved) return;
      markedIdle++;

      const openIdleAnomaly = await tx.anomaly.findFirst({
        where: { resourceId: resource.id, kind: 'IDLE', status: 'OPEN' },
      });

      if (!openIdleAnomaly) {
        await tx.anomaly.create({
          data: {
            resourceId: resource.id,
            kind: 'IDLE',
            // Idle is a cost problem, not an outage; severity scales with spend.
            severity: resource.estCostPerDay >= 100 ? 'HIGH' : resource.estCostPerDay >= 25 ? 'MEDIUM' : 'LOW',
            expected: env.IDLE_CPU_THRESHOLD,
            actual: round(avgCpu),
            deviation: round(env.IDLE_CPU_THRESHOLD - avgCpu),
            message,
            detectedAt: new Date(),
          },
        });
      }

      const { type, reason } = recommendationFor(resource.type, avgCpu);
      const existingRec = await tx.recommendation.findFirst({
        where: { resourceId: resource.id, type, applied: false },
      });

      if (!existingRec) {
        await tx.recommendation.create({
          data: {
            resourceId: resource.id,
            type,
            reason,
            estSaving: round(resource.estCostPerDay * 30 * (type === 'DOWNSIZE' ? 0.5 : 1)),
          },
        });
        recommendationsCreated++;
      }

      await tx.alert.create({
        data: {
          userId: resource.ownerId,
          kind: 'IDLE',
          message: `${resource.name} is idle. ${message}`,
        },
      });

      await writeAudit(
        {
          actorId: SYSTEM_ACTOR,
          action: 'IDLE_DETECTED',
          entity: 'Resource',
          entityId: resource.id,
          after: { avgCpu: round(avgCpu), windowDays: env.IDLE_WINDOW_DAYS },
        },
        tx,
      );
    });
  }

  const out = {
    scannedResources: resources.length,
    markedIdle,
    recovered,
    escalatedToFlagged,
    recommendationsCreated,
    durationMs: Date.now() - startedAt,
  };
  logger.info(out, 'detectIdle finished');
  return out;
}

/** BACKEND.md §6.3 — recommendation type follows from resource kind and how dead it is. */
function recommendationFor(
  type: string,
  avgCpu: number,
): { type: 'STOP' | 'DOWNSIZE' | 'DELETE_UNUSED'; reason: string } {
  if (type === 'S3' || type === 'EBS') {
    return {
      type: 'DELETE_UNUSED',
      reason: 'Storage resource shows no meaningful access or attachment over the idle window.',
    };
  }
  if (avgCpu < 1) {
    return {
      type: 'STOP',
      reason: 'Effectively zero CPU while running — stopping it removes the cost entirely.',
    };
  }
  return {
    type: 'DOWNSIZE',
    reason: 'Consistently low but non-zero CPU — a smaller instance class would carry this load.',
  };
}
