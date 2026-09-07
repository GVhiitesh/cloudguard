import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { daysQuerySchema } from './analytics.schema';
import * as service from './analytics.service';

export const analyticsRouter = Router();

analyticsRouter.use(auth);

analyticsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    res.json(await service.summary());
  }),
);

analyticsRouter.get(
  '/cost-trend',
  validate({ query: daysQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.costTrend((req.query as unknown as { days: number }).days));
  }),
);

analyticsRouter.get(
  '/utilization',
  validate({ query: daysQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.utilization((req.query as unknown as { days: number }).days));
  }),
);

analyticsRouter.get(
  '/cost-forecast',
  validate({ query: daysQuerySchema }),
  asyncHandler(async (req, res) => {
    const days = (req.query as unknown as { days: number }).days;
    res.json(await service.costForecast(days, days));
  }),
);

analyticsRouter.get(
  '/by-environment',
  validate({ query: daysQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.byEnvironment((req.query as unknown as { days: number }).days));
  }),
);
