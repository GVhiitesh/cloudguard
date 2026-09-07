import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { prisma } from '../../config/db';
import { conflict, notFound, unauthorized } from '../../lib/errors';
import { signToken } from '../../middleware/auth';
import { writeAudit } from '../../lib/audit';
import type { LoginInput, RegisterInput } from './auth.schema';

const SALT_ROUNDS = 10;

export type PublicUser = Omit<User, 'password'>;

export function toPublicUser(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with that email already exists');

  // Spec §8: the very first account to register becomes ADMIN, everyone else VIEWER.
  const isFirstUser = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, SALT_ROUNDS),
      role: isFirstUser ? 'ADMIN' : 'VIEWER',
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'REGISTER_USER',
    entity: 'User',
    entityId: user.id,
    after: { email: user.email, role: user.role },
  });

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same error for unknown email and wrong password — do not leak which accounts exist.
  if (!user) throw unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw unauthorized('Invalid email or password');

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User no longer exists');
  return toPublicUser(user);
}
