import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { conflict, notFound } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';
import { assertTransition } from '../../lib/lifecycle';
import { round } from '../../lib/stats';
import type { AuthUser } from '../../middleware/auth';
import {
  applyRecommendationSchema,
  listRecommendationsQuerySchema,
} from './recommendations.schema';

type ListQuery = z.infer<typeof listRecommendationsQuerySchema>;
type ApplyInput = z.infer<typeof applyRecommendationSchema>;

const withResource = {
  resource: {
    select: {
      id: true,
      name: true,
      type: true,
      environment: true,
      lifecycle: true,
      status: true,
      estCostPerDay: true,
    },
  },
} satisfies Prisma.RecommendationInclude;

export async function list(query: ListQuery) {
  const where: Prisma.RecommendationWhereInput = {
    ...(query.applied !== undefined ? { applied: query.applied } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.resourceId ? { resourceId: query.resourceId } : {}),
  };

  const [total, data, savings] = await prisma.$transaction([
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      include: withResource,
      orderBy: [{ estSaving: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.recommendation.aggregate({ where: { ...where, applied: false }, _sum: { estSaving: true } }),
  ]);

  return {
    data,
    potentialMonthlySaving: round(savings._sum.estSaving ?? 0),
    pagination: { page: query.page, pageSize: query.pageSize, total },
  };
}

/**
 * Marks a recommendation applied, and optionally carries out its side effects
 * (stopping the resource, moving its lifecycle). All of it in one transaction so
 * a rejected lifecycle move does not leave the recommendation falsely applied.
 */
export async function apply(id: string, input: ApplyInput, actor: AuthUser) {
  const rec = await prisma.recommendation.findUnique({ where: { id }, include: { resource: true } });
  if (!rec) throw notFound('Recommendation not found');
  if (rec.applied) throw conflict('Recommendation has already been applied');

  if (input.lifecycle) {
    assertTransition(rec.resource.lifecycle, input.lifecycle, actor.role);
  }

  return prisma.$transaction(async (tx) => {
    const updatedRec = await tx.recommendation.update({
      where: { id },
      data: { applied: true },
      include: withResource,
    });

    const resourceData: Prisma.ResourceUpdateInput = {
      ...(input.stopResource ? { status: 'STOPPED' } : {}),
      ...(input.lifecycle
        ? {
            lifecycle: input.lifecycle,
            ...(input.lifecycle === 'IDLE'
              ? { idleSince: rec.resource.idleSince ?? new Date() }
              : { idleSince: null }),
          }
        : {}),
    };

    const resource =
      Object.keys(resourceData).length > 0
        ? await tx.resource.update({ where: { id: rec.resourceId }, data: resourceData })
        : rec.resource;

    await writeAudit(
      {
        actorId: actor.id,
        action: 'APPLY_RECOMMENDATION',
        entity: 'Recommendation',
        entityId: id,
        before: {
          applied: false,
          resourceStatus: rec.resource.status,
          resourceLifecycle: rec.resource.lifecycle,
        },
        after: {
          applied: true,
          type: rec.type,
          estSaving: rec.estSaving,
          resourceStatus: resource.status,
          resourceLifecycle: resource.lifecycle,
        },
      },
      tx,
    );

    await tx.alert.create({
      data: {
        userId: rec.resource.ownerId,
        kind: 'RECOMMENDATION',
        message:
          `Recommendation ${rec.type} applied to "${rec.resource.name}" — ` +
          `estimated saving Rs ${round(rec.estSaving)}/month.`,
      },
    });

    return { recommendation: updatedRec, resource };
  });
}
