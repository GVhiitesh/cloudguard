import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { listAlertsQuerySchema } from './alerts.schema';

type ListQuery = z.infer<typeof listAlertsQuerySchema>;

/** A user sees their own alerts plus broadcasts (userId = null). */
function visibleTo(userId: string): Prisma.AlertWhereInput {
  return { OR: [{ userId }, { userId: null }] };
}

export async function list(query: ListQuery, actor: AuthUser) {
  const where: Prisma.AlertWhereInput = {
    ...visibleTo(actor.id),
    ...(query.read !== undefined ? { read: query.read } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
  };

  const [total, data, unread] = await prisma.$transaction([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.alert.count({ where: { ...visibleTo(actor.id), read: false } }),
  ]);

  return { data, unread, pagination: { page: query.page, pageSize: query.pageSize, total } };
}

export async function markRead(id: string, actor: AuthUser) {
  const alert = await prisma.alert.findFirst({ where: { id, ...visibleTo(actor.id) } });
  if (!alert) throw notFound('Alert not found');
  return prisma.alert.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(actor: AuthUser) {
  const result = await prisma.alert.updateMany({
    where: { ...visibleTo(actor.id), read: false },
    data: { read: true },
  });
  return { updated: result.count };
}
