import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

export const listUsersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });
