import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import {
  applyRecommendationSchema,
  idParamSchema,
  listRecommendationsQuerySchema,
} from './recommendations.schema';
import * as controller from './recommendations.controller';

export const recommendationsRouter = Router();

recommendationsRouter.use(auth);

recommendationsRouter.get(
  '/',
  validate({ query: listRecommendationsQuerySchema }),
  asyncHandler(controller.list),
);
recommendationsRouter.post(
  '/:id/apply',
  requireRole('EDITOR', 'ADMIN'),
  validate({ params: idParamSchema, body: applyRecommendationSchema }),
  asyncHandler(controller.apply),
);
