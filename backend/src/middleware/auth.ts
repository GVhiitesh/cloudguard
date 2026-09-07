import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { unauthorized } from '../lib/errors';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function auth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing Bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    next(unauthorized(message));
  }
}
