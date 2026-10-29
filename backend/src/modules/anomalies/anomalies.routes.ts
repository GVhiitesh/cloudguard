import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { idParamSchema, listAnomaliesQuerySchema, updateAnomalySchema } from './anomalies.schema';
import * as controller from './anomalies.controller';

export const anomaliesRouter = Router();

anomaliesRouter.use(auth);

anomaliesRouter.get('/', validate({ query: listAnomaliesQuerySchema }), asyncHandler(controller.list));
anomaliesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
anomaliesRouter.patch(
  '/:id',
  requireRole('EDITOR', 'ADMIN'),
  validate({ params: idParamSchema, body: updateAnomalySchema }),
  asyncHandler(controller.updateStatus),
);
