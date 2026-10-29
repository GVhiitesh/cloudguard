import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { createBudgetSchema, idParamSchema, updateBudgetSchema } from './budgets.schema';
import * as controller from './budgets.controller';

export const budgetsRouter = Router();

budgetsRouter.use(auth);

budgetsRouter.get('/status', asyncHandler(controller.status));
budgetsRouter.get('/', asyncHandler(controller.list));
budgetsRouter.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createBudgetSchema }),
  asyncHandler(controller.create),
);
budgetsRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateBudgetSchema }),
  asyncHandler(controller.update),
);
budgetsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
