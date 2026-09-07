import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

export const listRecommendationsQuerySchema = z.object({
  applied: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  type: z.string().trim().min(1).optional(),
  resourceId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(25),
});

export const applyRecommendationSchema = z
  .object({
    /** Optionally move the resource's lifecycle as part of applying. */
    lifecycle: z.enum(['ACTIVE', 'IDLE', 'FLAGGED', 'REVIEWED', 'ARCHIVED']).optional(),
    /** Optionally stop the resource (only meaningful for STOP recommendations). */
    stopResource: z.boolean().default(false),
  })
  .default({ stopResource: false });
