import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { backfill, inject, tick } from '../../jobs/simulator';
import { detectAnomalies } from '../../jobs/detectAnomalies';
import { detectIdle } from '../../jobs/detectIdle';
import { writeAudit } from '../../lib/audit';
import { backfillSchema, injectSchema } from './simulator.schema';

export const simulatorRouter = Router();

simulatorRouter.use(auth, requireRole('ADMIN'));

/** Force a spike on demand — the live-demo button. */
simulatorRouter.post(
  '/inject',
  validate({ body: injectSchema }),
  asyncHandler(async (req, res) => {
    const { resourceId, costMultiplier, cpu, runDetection } = req.body;
    const point = await inject({ resourceId, costMultiplier, cpu });

    await writeAudit({
      actorId: req.user!.id,
      action: 'SIMULATOR_INJECT',
      entity: 'Resource',
      entityId: resourceId,
      after: point,
    });

    const detection = runDetection ? await detectAnomalies() : null;
    res.status(201).json({ injected: point, detection });
  }),
);

/** Advance the simulator by one tick without waiting for cron. */
simulatorRouter.post(
  '/tick',
  asyncHandler(async (_req, res) => {
    res.json(await tick());
  }),
);

/** Regenerate history. Safe to re-run: existing days are left untouched. */
simulatorRouter.post(
  '/backfill',
  validate({ body: backfillSchema }),
  asyncHandler(async (req, res) => {
    res.json(await backfill(req.body.days));
  }),
);

/** Run both detectors immediately. */
simulatorRouter.post(
  '/detect',
  asyncHandler(async (_req, res) => {
    const idle = await detectIdle();
    const anomalies = await detectAnomalies();
    res.json({ idle, anomalies });
  }),
);
