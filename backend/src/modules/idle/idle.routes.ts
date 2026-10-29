import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../lib/async';
import { listIdle } from './idle.service';

export const idleRouter = Router();

idleRouter.get(
  '/',
  auth,
  asyncHandler(async (_req, res) => {
    res.json(await listIdle());
  }),
);
