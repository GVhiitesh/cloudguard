import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '@prisma/client';
import { prisma } from '../../config/db';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/errors';
import { signToken } from '../../middleware/auth';
import { writeAudit } from '../../lib/audit';
import type { LoginInput, RegisterInput } from './auth.schema';

const SALT_ROUNDS = 12;

export type PublicUser = Omit<User, 'password' | 'mfaSecret'>;

export function toPublicUser(user: User): PublicUser {
  const { password: _password, mfaSecret: _mfaSecret, ...rest } = user;
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

  // If MFA is enabled on user account, enforce TOTP verification
  if (user.mfaEnabled) {
    if (!input.totpCode) {
      return {
        mfaRequired: true,
        message: 'MFA is enabled on this account. Please provide your 6-digit TOTP code in totpCode.',
      };
    }
    const isValid = authenticator.check(input.totpCode, user.mfaSecret || '');
    if (!isValid) {
      throw unauthorized('Invalid or expired MFA TOTP code');
    }
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function generateMfaSetup(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'CloudGuard', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  // Store temporary unconfirmed secret
  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: secret },
  });

  return { secret, qrCodeDataUrl, otpauth };
}

export async function verifyAndEnableMfa(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) throw badRequest('MFA setup has not been initiated');

  const isValid = authenticator.check(token, user.mfaSecret);
  if (!isValid) throw unauthorized('Invalid MFA TOTP code');

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });

  await writeAudit({
    actorId: userId,
    action: 'ENABLE_MFA',
    entity: 'User',
    entityId: userId,
    after: { mfaEnabled: true },
  });

  return { success: true, message: 'MFA successfully enabled' };
}

export async function disableMfa(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) throw badRequest('MFA is not enabled');

  const isValid = authenticator.check(token, user.mfaSecret);
  if (!isValid) throw unauthorized('Invalid MFA TOTP code');

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  return { success: true, message: 'MFA successfully disabled' };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User no longer exists');
  return toPublicUser(user);
}
