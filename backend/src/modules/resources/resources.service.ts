import { Lifecycle, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { notFound } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';
import { assertTransition, allowedTransitions } from '../../lib/lifecycle';
import { healthScore, healthBreakdown } from '../../lib/healthScore';
import { mean, round, trend } from '../../lib/stats';
import type { AuthUser } from '../../middleware/auth';
import {
  createResourceSchema,
  listResourcesQuerySchema,
  updateResourceSchema,
} from './resources.schema';

type CreateInput = z.infer<typeof createResourceSchema>;
type UpdateInput = z.infer<typeof updateResourceSchema>;
type ListQuery = z.infer<typeof listResourcesQuerySchema>;

const resourceInclude = {
  tags: true,
  owner: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.ResourceInclude;

/** Upserts tags by (key,value) and returns a connect payload. */
async function connectTags(tags: Array<{ key: string; value: string }>) {
  const records = await Promise.all(
    tags.map((t) =>
      prisma.tag.upsert({
        where: { key_value: { key: t.key, value: t.value } },
        create: t,
        update: {},
      }),
    ),
  );
  return records.map((t) => ({ id: t.id }));
}

function tagFilter(tag: string): Prisma.ResourceWhereInput {
  const [key, ...rest] = tag.split(':');
  const value = rest.join(':');
  return { tags: { some: value ? { key, value } : { key } } };
}

export async function list(query: ListQuery) {
  const where: Prisma.ResourceWhereInput = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.environment ? { environment: query.environment } : {}),
    ...(query.lifecycle ? { lifecycle: query.lifecycle } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.tag ? tagFilter(query.tag) : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };

  const [total, data] = await prisma.$transaction([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      include: resourceInclude,
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, pagination: { page: query.page, pageSize: query.pageSize, total } };
}

export async function getById(id: string) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!resource) throw notFound('Resource not found');
  return resource;
}

export async function create(input: CreateInput, actor: AuthUser) {
  const { tags, ownerId, metadata, ...rest } = input;

  // A VIEWER never reaches here (RBAC), and an EDITOR may only create for itself.
  const finalOwnerId = actor.role === 'ADMIN' && ownerId ? ownerId : actor.id;

  const resource = await prisma.resource.create({
    data: {
      ...rest,
      ownerId: finalOwnerId,
      metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ...(tags?.length ? { tags: { connect: await connectTags(tags) } } : {}),
    },
    include: resourceInclude,
  });

  await writeAudit({
    actorId: actor.id,
    action: 'CREATE_RESOURCE',
    entity: 'Resource',
    entityId: resource.id,
    after: resource,
  });

  return resource;
}

export async function update(id: string, input: UpdateInput, actor: AuthUser) {
  const before = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!before) throw notFound('Resource not found');

  const { tags, metadata, ownerId, ...rest } = input;

  const after = await prisma.resource.update({
    where: { id },
    data: {
      ...rest,
      // Reassigning an owner is an ADMIN-only act.
      ...(ownerId && actor.role === 'ADMIN' ? { ownerId } : {}),
      ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
      // Tags are declarative: the array sent replaces the whole set.
      ...(tags ? { tags: { set: await connectTags(tags) } } : {}),
    },
    include: resourceInclude,
  });

  await writeAudit({
    actorId: actor.id,
    action: 'UPDATE_RESOURCE',
    entity: 'Resource',
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function remove(id: string, actor: AuthUser) {
  const before = await prisma.resource.findUnique({ where: { id } });
  if (!before) throw notFound('Resource not found');

  // Metrics/anomalies/recommendations cascade; tags are shared so they survive.
  await prisma.resource.delete({ where: { id } });

  await writeAudit({
    actorId: actor.id,
    action: 'DELETE_RESOURCE',
    entity: 'Resource',
    entityId: id,
    before,
  });
}

/**
 * Manual lifecycle move. Automatic moves made by the detection jobs go through
 * jobs/lifecycleOps, which shares assertTransition but uses a system actor.
 */
export async function changeLifecycle(id: string, to: Lifecycle, actor: AuthUser, note?: string) {
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) throw notFound('Resource not found');

  assertTransition(resource.lifecycle, to, actor.role as Role);

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.resource.update({
      where: { id },
      data: {
        lifecycle: to,
        // Leaving IDLE clears the idle clock so escalation restarts cleanly.
        ...(to === 'IDLE' ? { idleSince: resource.idleSince ?? new Date() } : { idleSince: null }),
      },
      include: resourceInclude,
    });

    await writeAudit(
      {
        actorId: actor.id,
        action: 'LIFECYCLE_CHANGE',
        entity: 'Resource',
        entityId: id,
        before: { lifecycle: resource.lifecycle },
        after: { lifecycle: to, note: note ?? null },
      },
      tx,
    );

    return next;
  });

  return { resource: updated, allowedNext: allowedTransitions(to) };
}

/**
 * The digital twin: one call that collapses the resource, its metric history,
 * anomalies, recommendations and a computed health score into a single profile.
 */
export async function twin(id: string, days: number) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!resource) throw notFound('Resource not found');

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [metrics, anomalies, recommendations] = await prisma.$transaction([
    prisma.usageMetric.findMany({
      where: { resourceId: id, timestamp: { gte: from } },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.anomaly.findMany({
      where: { resourceId: id },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    }),
    prisma.recommendation.findMany({
      where: { resourceId: id, applied: false },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const costs = metrics.map((m) => m.cost);
  const cpus = metrics.map((m) => m.cpu);
  const openAnomalies = anomalies.filter((a) => a.status === 'OPEN').length;
  const costTrend = trend(costs);
  const isIdle = resource.lifecycle === 'IDLE';

  const inputs = { openAnomalies, isIdle, costTrendUp: costTrend === 'up' };
  const score = healthScore(inputs);

  // Keep the stored score in step with what the twin reports.
  if (score !== resource.healthScore) {
    await prisma.resource.update({ where: { id }, data: { healthScore: score } });
  }

  return {
    resource: { ...resource, healthScore: score },
    healthScore: score,
    healthBreakdown: healthBreakdown(inputs),
    lifecycle: resource.lifecycle,
    allowedNext: allowedTransitions(resource.lifecycle),
    usageSummary: {
      windowDays: days,
      dataPoints: metrics.length,
      avgCpu: round(mean(cpus)),
      avgMemory: round(mean(metrics.map((m) => m.memory))),
      avgCost: round(mean(costs)),
      totalCost: round(costs.reduce((a, b) => a + b, 0)),
      projectedMonthlyCost: round(mean(costs) * 30),
      trend: costTrend,
    },
    history: metrics.map((m) => ({
      timestamp: m.timestamp,
      cpu: round(m.cpu),
      memory: round(m.memory),
      networkIn: round(m.networkIn),
      networkOut: round(m.networkOut),
      storageUsed: round(m.storageUsed),
      cost: round(m.cost),
    })),
    anomalies,
    recommendations,
    tags: resource.tags,
  };
}
