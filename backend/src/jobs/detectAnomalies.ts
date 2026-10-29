import { AnomalyKind, Severity } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { detectSpike, round } from '../lib/stats';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DetectionResult {
  scannedResources: number;
  created: number;
  skipped: number;
  durationMs: number;
}

/** Collapses raw metric rows into one point per UTC day. */
function dailySeries(
  rows: Array<{ timestamp: Date; cost: number; cpu: number }>,
): Array<{ day: number; cost: number; cpu: number }> {
  const byDay = new Map<number, { cost: number; cpu: number[] }>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.getTime();
    const entry = byDay.get(key) ?? { cost: 0, cpu: [] };
    entry.cost += r.cost; // cost is a flow: sum it
    entry.cpu.push(r.cpu); // cpu is a gauge: average it
    byDay.set(key, entry);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, v]) => ({
      day,
      cost: v.cost,
      cpu: v.cpu.reduce((a, b) => a + b, 0) / v.cpu.length,
    }));
}

/**
 * Cost and usage spike detection over stored metrics.
 *
 * Runs on a schedule, never on the request path. For each resource it takes the
 * trailing ANOMALY_WINDOW_DAYS as a baseline, compares the most recent day
 * against it, and records an anomaly when the z-score and both magnitude guards
 * agree. Existing OPEN anomalies of the same kind suppress a duplicate so a
 * multi-day spike raises one alert, not one per run.
 */
export async function detectAnomalies(): Promise<DetectionResult> {
  const startedAt = Date.now();
  const windowDays = env.ANOMALY_WINDOW_DAYS;
  const from = new Date(Date.now() - (windowDays + 2) * DAY_MS);

  const resources = await prisma.resource.findMany({
    where: { lifecycle: { not: 'ARCHIVED' } },
    select: { id: true, name: true, ownerId: true, estCostPerDay: true },
  });

  let created = 0;
  let skipped = 0;

  for (const resource of resources) {
    const rows = await prisma.usageMetric.findMany({
      where: { resourceId: resource.id, timestamp: { gte: from } },
      select: { timestamp: true, cost: true, cpu: true },
      orderBy: { timestamp: 'asc' },
    });

    const series = dailySeries(rows);
    if (series.length < 2) {
      skipped++;
      continue;
    }

    const latest = series[series.length - 1];
    const baseline = series.slice(0, -1).slice(-windowDays);

    const checks: Array<{
      kind: AnomalyKind;
      actual: number;
      window: number[];
      minAbsDelta: number;
      unit: string;
    }> = [
      {
        kind: 'COST_SPIKE',
        actual: latest.cost,
        window: baseline.map((p) => p.cost),
        minAbsDelta: env.ANOMALY_MIN_ABS_DELTA,
        unit: 'Rs',
      },
      {
        kind: 'USAGE_SPIKE',
        actual: latest.cpu,
        window: baseline.map((p) => p.cpu),
        // CPU is a percentage, so a fixed 20-point jump is the meaningful guard.
        minAbsDelta: 20,
        unit: '% CPU',
      },
    ];

    for (const check of checks) {
      const result = detectSpike(check.actual, check.window, {
        ratioGuard: 1.5,
        minAbsDelta: check.minAbsDelta,
        minWindowSize: 5,
      });

      if (!result.isSpike || !result.severity) continue;

      // One OPEN anomaly per resource+kind at a time.
      const existing = await prisma.anomaly.findFirst({
        where: { resourceId: resource.id, kind: check.kind, status: 'OPEN' },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const detectedAt = new Date(latest.day);
      const message =
        check.kind === 'COST_SPIKE'
          ? `Cost spiked to ${check.unit} ${round(result.actual)} against a ${windowDays}-day ` +
            `average of ${check.unit} ${round(result.mean)} (z=${round(result.z)}).`
          : `CPU spiked to ${round(result.actual)}${check.unit} against a ${windowDays}-day ` +
            `average of ${round(result.mean)}${check.unit} (z=${round(result.z)}).`;

      await prisma.$transaction(async (tx) => {
        await tx.anomaly.create({
          data: {
            resourceId: resource.id,
            kind: check.kind,
            severity: result.severity as Severity,
            expected: round(result.mean),
            actual: round(result.actual),
            deviation: round(result.z),
            message,
            detectedAt,
          },
        });

        await tx.alert.create({
          data: {
            userId: resource.ownerId,
            kind: 'ANOMALY',
            message: `[${result.severity}] ${resource.name}: ${message}`,
          },
        });
      });

      created++;
      logger.info(
        { resourceId: resource.id, kind: check.kind, z: round(result.z) },
        'Anomaly detected',
      );
    }
  }

  const out = {
    scannedResources: resources.length,
    created,
    skipped,
    durationMs: Date.now() - startedAt,
  };
  logger.info(out, 'detectAnomalies finished');
  return out;
}
