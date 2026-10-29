import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/errors';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
