import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError, conflict, notFound } from '../../lib/errors';
import { writeAudit } from '../../lib/audit';
import { toPublicUser } from '../auth/auth.service';
import { z } from 'zod';
import { listUsersQuerySchema, updateUserSchema } from './users.schema';

type ListQuery = z.infer<typeof listUsersQuerySchema>;
type UpdateInput = z.infer<typeof updateUserSchema>;

export async function list(query: ListQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { email: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: users.map(toPublicUser),
    pagination: { page: query.page, pageSize: query.pageSize, total },
  };
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { resources: true } } },
  });
  if (!user) throw notFound('User not found');
  const { _count, ...rest } = user;
  return { ...toPublicUser(rest), resourceCount: _count.resources };
}

export async function update(id: string, input: UpdateInput, actorId: string) {
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw notFound('User not found');

  // Never let the last ADMIN demote itself out of existence.
  if (input.role && before.role === 'ADMIN' && input.role !== 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw conflict('Cannot demote the last remaining ADMIN');
  }

  const after = await prisma.user.update({ where: { id }, data: input });

  await writeAudit({
    actorId,
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: id,
    before: { name: before.name, role: before.role },
    after: { name: after.name, role: after.role },
  });

  return toPublicUser(after);
}

export async function remove(id: string, actorId: string) {
  if (id === actorId) throw new AppError(400, 'You cannot delete your own account');

  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { resources: true } } },
  });
  if (!user) throw notFound('User not found');

  if (user.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw conflict('Cannot delete the last remaining ADMIN');
  }

  // Resources have a required owner, so deletion must not orphan them.
  if (user._count.resources > 0) {
    throw conflict(
      `User still owns ${user._count.resources} resource(s). Reassign them before deleting.`,
    );
  }

  await prisma.user.delete({ where: { id } });
  await writeAudit({
    actorId,
    action: 'DELETE_USER',
    entity: 'User',
    entityId: id,
    before: { email: user.email, role: user.role },
  });
}

export const ROLES: Role[] = ['ADMIN', 'EDITOR', 'VIEWER'];
