import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

export const listAnomaliesQuerySchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  kind: z.enum(['COST_SPIKE', 'USAGE_SPIKE', 'IDLE']).optional(),
  resourceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(25),
});

export const updateAnomalySchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
});
