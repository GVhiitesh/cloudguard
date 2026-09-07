import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import {
  createResourceSchema,
  idParamSchema,
  lifecycleSchema,
  listResourcesQuerySchema,
  twinQuerySchema,
  updateResourceSchema,
} from './resources.schema';
import * as controller from './resources.controller';
import { metricsQuerySchema } from '../metrics/metrics.schema';
import * as metricsController from '../metrics/metrics.controller';

export const resourcesRouter = Router();

resourcesRouter.use(auth);

resourcesRouter.get('/', validate({ query: listResourcesQuerySchema }), asyncHandler(controller.list));
resourcesRouter.post(
  '/',
  requireRole('EDITOR', 'ADMIN'),
  validate({ body: createResourceSchema }),
  asyncHandler(controller.create),
);

resourcesRouter.get(
  '/:id/twin',
  validate({ params: idParamSchema, query: twinQuerySchema }),
  asyncHandler(controller.twin),
);
resourcesRouter.get(
  '/:id/metrics',
  validate({ params: idParamSchema, query: metricsQuerySchema }),
  asyncHandler(metricsController.listForResource),
);
resourcesRouter.post(
  '/:id/lifecycle',
  requireRole('EDITOR', 'ADMIN'),
  validate({ params: idParamSchema, body: lifecycleSchema }),
  asyncHandler(controller.lifecycle),
);

resourcesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
resourcesRouter.patch(
  '/:id',
  requireRole('EDITOR', 'ADMIN'),
  validate({ params: idParamSchema, body: updateResourceSchema }),
  asyncHandler(controller.update),
);
resourcesRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
