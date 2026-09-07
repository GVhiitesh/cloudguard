import { AnomalyStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { notFound } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';
import type { AuthUser } from '../../middleware/auth';
import { listAnomaliesQuerySchema } from './anomalies.schema';

type ListQuery = z.infer<typeof listAnomaliesQuerySchema>;

const withResource = {
  resource: { select: { id: true, name: true, type: true, environment: true, lifecycle: true } },
} satisfies Prisma.AnomalyInclude;

export async function list(query: ListQuery) {
  const where: Prisma.AnomalyWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.resourceId ? { resourceId: query.resourceId } : {}),
    ...(query.from || query.to
      ? {
          detectedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, data] = await prisma.$transaction([
    prisma.anomaly.count({ where }),
    prisma.anomaly.findMany({
      where,
      include: withResource,
      // Worst first: HIGH severity ahead of the merely recent.
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, pagination: { page: query.page, pageSize: query.pageSize, total } };
}

export async function getById(id: string) {
  const anomaly = await prisma.anomaly.findUnique({ where: { id }, include: withResource });
  if (!anomaly) throw notFound('Anomaly not found');
  return anomaly;
}

export async function updateStatus(id: string, status: AnomalyStatus, actor: AuthUser) {
  const before = await prisma.anomaly.findUnique({ where: { id } });
  if (!before) throw notFound('Anomaly not found');

  const after = await prisma.anomaly.update({
    where: { id },
    data: { status },
    include: withResource,
  });

  await writeAudit({
    actorId: actor.id,
    action: 'UPDATE_ANOMALY_STATUS',
    entity: 'Anomaly',
    entityId: id,
    before: { status: before.status },
    after: { status },
  });

  return after;
}
