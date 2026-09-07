import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { ingestSchema } from './metrics.schema';
import * as controller from './metrics.controller';

export const metricsRouter = Router();

metricsRouter.post(
  '/ingest',
  auth,
  requireRole('ADMIN'),
  validate({ body: ingestSchema }),
  asyncHandler(controller.ingest),
);
