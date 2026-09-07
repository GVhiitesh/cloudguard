import { z } from 'zod';

export const RESOURCE_TYPES = ['EC2', 'RDS', 'S3', 'LAMBDA', 'EBS', 'OTHER'] as const;
export const ENVIRONMENTS = ['DEV', 'STAGING', 'PROD'] as const;
export const STATUSES = ['RUNNING', 'STOPPED'] as const;
export const LIFECYCLES = ['ACTIVE', 'IDLE', 'FLAGGED', 'REVIEWED', 'ARCHIVED'] as const;

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

const tagInput = z.object({
  key: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(120),
});

export const createResourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(RESOURCE_TYPES),
  provider: z.string().trim().min(1).max(40).default('AWS'),
  region: z.string().trim().min(1).max(40),
  environment: z.enum(ENVIRONMENTS),
  status: z.enum(STATUSES).default('RUNNING'),
  ownerId: z.string().uuid().optional(),
  estCostPerDay: z.number().nonnegative().default(0),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(tagInput).max(20).optional(),
});

export const updateResourceSchema = createResourceSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listResourcesQuerySchema = z.object({
  type: z.enum(RESOURCE_TYPES).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  lifecycle: z.enum(LIFECYCLES).optional(),
  status: z.enum(STATUSES).optional(),
  ownerId: z.string().uuid().optional(),
  /** Tag filter as "key" or "key:value". */
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  sort: z.enum(['createdAt', 'name', 'estCostPerDay', 'healthScore']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(25),
});

export const lifecycleSchema = z.object({
  to: z.enum(LIFECYCLES),
  note: z.string().trim().max(500).optional(),
});

export const twinQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});
