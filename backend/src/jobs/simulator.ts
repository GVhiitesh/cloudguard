import { Prisma, Resource, ResourceType } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { round } from '../lib/stats';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Per-type baseline behaviour. Cost is in Rs per day at the reference load. */
interface Baseline {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  storageUsed: number;
  costPerDay: number;
}

const BASELINES: Record<ResourceType, Baseline> = {
  EC2: { cpu: 42, memory: 55, networkIn: 820, networkOut: 640, storageUsed: 64, costPerDay: 180 },
  RDS: { cpu: 35, memory: 68, networkIn: 410, networkOut: 380, storageUsed: 220, costPerDay: 340 },
  S3: { cpu: 2, memory: 3, networkIn: 120, networkOut: 260, storageUsed: 1400, costPerDay: 95 },
  LAMBDA: { cpu: 18, memory: 30, networkIn: 60, networkOut: 45, storageUsed: 1, costPerDay: 40 },
  EBS: { cpu: 1, memory: 2, networkIn: 30, networkOut: 25, storageUsed: 500, costPerDay: 60 },
  OTHER: { cpu: 20, memory: 30, networkIn: 100, networkOut: 90, storageUsed: 40, costPerDay: 70 },
};

/** Box-Muller gaussian. */
function gaussian(mean: number, sd: number): number {
  const u1 = Math.random() || Number.EPSILON;
  const u2 = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Scenario tags drive the demo. A resource carrying `sim:spike` gets a cost
 * spike near the end of the backfill; `sim:idle` flatlines for the idle window;
 * `sim:healthy` is the control. Anything untagged just wobbles around baseline.
 */
export type Scenario = 'spike' | 'idle' | 'healthy' | 'normal';

export function scenarioFor(tags: Array<{ key: string; value: string }>): Scenario {
  const tag = tags.find((t) => t.key === 'sim');
  if (tag?.value === 'spike') return 'spike';
  if (tag?.value === 'idle') return 'idle';
  if (tag?.value === 'healthy') return 'healthy';
  return 'normal';
}

interface PointInput {
  resource: Pick<Resource, 'id' | 'type' | 'estCostPerDay' | 'status'>;
  scenario: Scenario;
  timestamp: Date;
  /** 0 = oldest day of the backfill, daysTotal-1 = today. */
  dayIndex: number;
  daysTotal: number;
}

/**
 * Generates one daily metric point.
 *
 * Cost is derived from utilisation rather than drawn independently, so a CPU
 * spike and a cost spike move together and the anomalies stay coherent.
 */
export function generatePoint(input: PointInput): Prisma.UsageMetricCreateManyInput {
  const base = BASELINES[input.resource.type];
  const dailyCost = input.resource.estCostPerDay > 0 ? input.resource.estCostPerDay : base.costPerDay;
  const daysFromEnd = input.daysTotal - 1 - input.dayIndex;

  let cpu: number;
  let costMultiplier = 1;

  if (input.resource.status === 'STOPPED') {
    // A stopped resource still bills for attached storage, nothing else.
    return {
      resourceId: input.resource.id,
      timestamp: input.timestamp,
      cpu: 0,
      memory: 0,
      networkIn: 0,
      networkOut: 0,
      storageUsed: round(base.storageUsed),
      cost: round(dailyCost * 0.12),
    };
  }

  switch (input.scenario) {
    case 'idle': {
      // Flat, near-zero for the last 12 days; normal before that, so the
      // recovery path and the "went idle on day X" story are both visible.
      const isIdleWindow = daysFromEnd <= 12;
      cpu = isIdleWindow ? clamp(gaussian(1.4, 0.6), 0.1, 4.5) : clamp(gaussian(base.cpu, 6), 1, 95);
      costMultiplier = 1; // idle resources keep costing full price
      // Idle boxes are fully quiet on the wire too — the idle detector needs it.
      if (isIdleWindow) {
        const q = base.storageUsed;
        return {
          resourceId: input.resource.id,
          timestamp: input.timestamp,
          cpu: round(cpu),
          memory: round(clamp(gaussian(6, 2), 1, 20)),
          networkIn: round(Math.max(0, gaussian(0.2, 0.1))),
          networkOut: round(Math.max(0, gaussian(0.2, 0.1))),
          storageUsed: round(q),
          cost: round(dailyCost * (0.5 + 0.5 * (cpu / Math.max(base.cpu, 1)))),
        };
      }
      break;
    }

    case 'spike': {
      // A single loud day, 3 days back — recent enough for the detector's
      // trailing window, old enough that the baseline is already established.
      const isSpikeDay = daysFromEnd === 3 || daysFromEnd === 0;
      cpu = isSpikeDay ? clamp(gaussian(base.cpu * 2.4, 5), 20, 99) : clamp(gaussian(base.cpu, 4), 1, 95);
      costMultiplier = isSpikeDay ? gaussian(3.1, 0.25) : gaussian(1, 0.06);
      break;
    }

    case 'healthy':
      cpu = clamp(gaussian(base.cpu, 3), 5, 90);
      costMultiplier = gaussian(1, 0.04);
      break;

    default:
      cpu = clamp(gaussian(base.cpu, 8), 1, 95);
      costMultiplier = gaussian(1, 0.1);
  }

  // Cost tracks utilisation: half fixed (the instance exists), half usage-driven.
  const utilisationRatio = cpu / Math.max(base.cpu, 1);
  const cost = Math.max(0, dailyCost * (0.5 + 0.5 * utilisationRatio) * Math.max(costMultiplier, 0));

  const activity = cpu / Math.max(base.cpu, 1);

  return {
    resourceId: input.resource.id,
    timestamp: input.timestamp,
    cpu: round(cpu),
    memory: round(clamp(gaussian(base.memory * (0.6 + 0.4 * activity), 5), 1, 99)),
    networkIn: round(Math.max(0, gaussian(base.networkIn * activity, base.networkIn * 0.15))),
    networkOut: round(Math.max(0, gaussian(base.networkOut * activity, base.networkOut * 0.15))),
    storageUsed: round(Math.max(0, gaussian(base.storageUsed, base.storageUsed * 0.03))),
    cost: round(cost),
  };
}

/** UTC midnight `daysBack` days before today. */
function dayAt(daysBack: number): Date {
  const d = new Date(Date.now() - daysBack * DAY_MS);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface BackfillResult {
  resources: number;
  days: number;
  pointsGenerated: number;
  pointsInserted: number;
}

/**
 * Writes `days` of daily history for every resource. Idempotent: the
 * (resourceId, timestamp) unique constraint plus skipDuplicates means running
 * it twice does not double a day's cost.
 */
export async function backfill(days = 30): Promise<BackfillResult> {
  const resources = await prisma.resource.findMany({ include: { tags: true } });
  if (resources.length === 0) {
    logger.warn('Backfill found no resources — run `npm run seed` first');
    return { resources: 0, days, pointsGenerated: 0, pointsInserted: 0 };
  }

  const points: Prisma.UsageMetricCreateManyInput[] = [];

  for (const resource of resources) {
    const scenario = scenarioFor(resource.tags);
    for (let i = 0; i < days; i++) {
      points.push(
        generatePoint({
          resource,
          scenario,
          timestamp: dayAt(days - 1 - i),
          dayIndex: i,
          daysTotal: days,
        }),
      );
    }
  }

  const result = await prisma.usageMetric.createMany({ data: points, skipDuplicates: true });

  logger.info(
    { resources: resources.length, days, inserted: result.count },
    'Metric backfill complete',
  );

  return {
    resources: resources.length,
    days,
    pointsGenerated: points.length,
    pointsInserted: result.count,
  };
}

/**
 * Writes today's point for every resource, overwriting the existing one.
 * This is what the cron calls — the day's figure is refined as the day goes on
 * rather than accumulating duplicate rows.
 */
export async function tick(): Promise<{ resources: number; upserted: number }> {
  const resources = await prisma.resource.findMany({ include: { tags: true } });
  const timestamp = dayAt(0);
  let upserted = 0;

  for (const resource of resources) {
    const point = generatePoint({
      resource,
      scenario: scenarioFor(resource.tags),
      timestamp,
      dayIndex: 29,
      daysTotal: 30,
    });

    await prisma.usageMetric.upsert({
      where: { resourceId_timestamp: { resourceId: resource.id, timestamp } },
      create: point,
      update: point,
    });
    upserted++;
  }

  logger.debug({ resources: resources.length, upserted }, 'Simulator tick');
  return { resources: resources.length, upserted };
}

export interface InjectOptions {
  resourceId: string;
  /** How many times the baseline cost to write for today. */
  costMultiplier?: number;
  /** Absolute CPU percentage to write for today. */
  cpu?: number;
}

/**
 * Manually forces a spike into today's point. Used by POST /api/simulator/inject
 * so a live demo can produce an anomaly on cue instead of waiting for one.
 */
export async function inject(opts: InjectOptions) {
  const resource = await prisma.resource.findUnique({
    where: { id: opts.resourceId },
    include: { tags: true },
  });
  if (!resource) throw new Error(`Resource ${opts.resourceId} not found`);

  const timestamp = dayAt(0);
  const base = BASELINES[resource.type];
  const multiplier = opts.costMultiplier ?? 3.5;
  const dailyCost = resource.estCostPerDay > 0 ? resource.estCostPerDay : base.costPerDay;
  const cpu = clamp(opts.cpu ?? base.cpu * 2.5, 0, 100);

  const point: Prisma.UsageMetricCreateManyInput = {
    resourceId: resource.id,
    timestamp,
    cpu: round(cpu),
    memory: round(clamp(base.memory * 1.6, 1, 99)),
    networkIn: round(base.networkIn * 2.2),
    networkOut: round(base.networkOut * 2.2),
    storageUsed: round(base.storageUsed),
    cost: round(dailyCost * multiplier),
  };

  await prisma.usageMetric.upsert({
    where: { resourceId_timestamp: { resourceId: resource.id, timestamp } },
    create: point,
    update: point,
  });

  logger.info({ resourceId: resource.id, multiplier, cpu: point.cpu }, 'Injected spike');
  return point;
}
