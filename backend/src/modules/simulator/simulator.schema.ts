import { z } from 'zod';

export const injectSchema = z.object({
  resourceId: z.string().uuid(),
  costMultiplier: z.number().min(1).max(50).optional(),
  cpu: z.number().min(0).max(100).optional(),
  /** Run detection straight after injecting, so the demo shows the anomaly at once. */
  runDetection: z.boolean().default(true),
});

export const backfillSchema = z.object({
  days: z.number().int().positive().max(365).default(30),
});
