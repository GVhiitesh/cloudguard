import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { idParamSchema, listAlertsQuerySchema } from './alerts.schema';
import * as controller from './alerts.controller';

export const alertsRouter = Router();

alertsRouter.use(auth);

alertsRouter.get('/', validate({ query: listAlertsQuerySchema }), asyncHandler(controller.list));
alertsRouter.patch('/read-all', asyncHandler(controller.markAllRead));
alertsRouter.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  asyncHandler(controller.markRead),
);
