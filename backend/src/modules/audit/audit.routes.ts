import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { listAuditQuerySchema } from './audit.schema';
import { list } from './audit.service';

export const auditRouter = Router();

auditRouter.get(
  '/',
  auth,
  requireRole('ADMIN'),
  validate({ query: listAuditQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await list(req.query as never));
  }),
);
