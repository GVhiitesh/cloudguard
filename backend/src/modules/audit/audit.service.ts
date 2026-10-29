import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { listAuditQuerySchema } from './audit.schema';

type ListQuery = z.infer<typeof listAuditQuerySchema>;

export async function list(query: ListQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  // Resolve actor names in one query rather than N joins; SYSTEM has no user row.
  const actorIds = [...new Set(rows.map((r) => r.actorId))].filter((id) => id !== 'SYSTEM');
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true, role: true },
  });
  const byId = new Map(actors.map((a) => [a.id, a]));

  return {
    data: rows.map((r) => ({
      ...r,
      actor: r.actorId === 'SYSTEM' ? { id: 'SYSTEM', name: 'System job' } : (byId.get(r.actorId) ?? null),
    })),
    pagination: { page: query.page, pageSize: query.pageSize, total },
  };
}
