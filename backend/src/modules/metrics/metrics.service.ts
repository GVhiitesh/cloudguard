import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { notFound } from '../../lib/errors';
import { round } from '../../lib/stats';
import { ingestSchema, metricsQuerySchema } from './metrics.schema';

type Query = z.infer<typeof metricsQuerySchema>;
type IngestInput = z.infer<typeof ingestSchema>;

interface Bucket {
  timestamp: Date;
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  storageUsed: number;
  cost: number;
}

/**
 * Aggregates raw points into hour/day buckets.
 *
 * Gauges (cpu, memory, storageUsed) are averaged; flows (networkIn/Out, cost)
 * are summed — averaging a cost series would silently understate a day's spend.
 */
function bucketize(
  rows: Array<Omit<Bucket, 'timestamp'> & { timestamp: Date }>,
  granularity: 'hour' | 'day',
): Bucket[] {
  const groups = new Map<number, typeof rows>();

  for (const row of rows) {
    const d = new Date(row.timestamp);
    d.setUTCMinutes(0, 0, 0);
    if (granularity === 'day') d.setUTCHours(0, 0, 0, 0);
    const key = d.getTime();
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, items]) => {
      const n = items.length;
      const sum = (f: (r: (typeof items)[number]) => number) =>
        items.reduce((acc, r) => acc + f(r), 0);
      return {
        timestamp: new Date(key),
        cpu: round(sum((r) => r.cpu) / n),
        memory: round(sum((r) => r.memory) / n),
        storageUsed: round(sum((r) => r.storageUsed) / n),
        networkIn: round(sum((r) => r.networkIn)),
        networkOut: round(sum((r) => r.networkOut)),
        cost: round(sum((r) => r.cost)),
      };
    });
}

export async function listForResource(resourceId: string, query: Query) {
  const exists = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true },
  });
  if (!exists) throw notFound('Resource not found');

  const where: Prisma.UsageMetricWhereInput = {
    resourceId,
    ...(query.from || query.to
      ? {
          timestamp: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.usageMetric.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: query.limit,
  });

  const data = query.granularity === 'raw' ? rows : bucketize(rows, query.granularity);

  return { resourceId, granularity: query.granularity, count: data.length, data };
}

/**
 * Bulk ingest. Idempotent on (resourceId, timestamp) so a re-run of the
 * simulator or a retried request cannot double-count a day's cost.
 */
export async function ingest(input: IngestInput) {
  const ids = [...new Set(input.metrics.map((m) => m.resourceId))];
  const known = await prisma.resource.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((r) => r.id));
  const missing = ids.filter((id) => !knownIds.has(id));
  if (missing.length > 0) throw notFound(`Unknown resourceId(s): ${missing.join(', ')}`);

  const result = await prisma.usageMetric.createMany({
    data: input.metrics,
    skipDuplicates: true,
  });

  return {
    received: input.metrics.length,
    inserted: result.count,
    skippedDuplicates: input.metrics.length - result.count,
  };
}
