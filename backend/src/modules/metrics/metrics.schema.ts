import { z } from 'zod';

export const metricsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    granularity: z.enum(['raw', 'hour', 'day']).default('day'),
    limit: z.coerce.number().int().positive().max(5000).default(1000),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: '`from` must be before or equal to `to`',
    path: ['from'],
  });

const metricPoint = z.object({
  resourceId: z.string().uuid(),
  timestamp: z.coerce.date(),
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0).max(100),
  networkIn: z.number().nonnegative(),
  networkOut: z.number().nonnegative(),
  storageUsed: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

export const ingestSchema = z.object({
  metrics: z.array(metricPoint).min(1).max(5000),
});
