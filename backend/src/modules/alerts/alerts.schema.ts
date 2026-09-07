import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

export const listAlertsQuerySchema = z.object({
  read: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  kind: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
