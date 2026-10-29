import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('Must be a UUID') });

export const createBudgetSchema = z
  .object({
    scope: z.enum(['GLOBAL', 'ENVIRONMENT', 'OWNER']),
    scopeValue: z.string().trim().min(1).optional(),
    limitPerMonth: z.number().positive(),
  })
  .superRefine((v, ctx) => {
    if (v.scope === 'GLOBAL' && v.scopeValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeValue'],
        message: 'GLOBAL budgets take no scopeValue',
      });
    }
    if (v.scope !== 'GLOBAL' && !v.scopeValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeValue'],
        message: `scopeValue is required for ${v.scope} budgets`,
      });
    }
    if (
      v.scope === 'ENVIRONMENT' &&
      v.scopeValue &&
      !['DEV', 'STAGING', 'PROD'].includes(v.scopeValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeValue'],
        message: 'ENVIRONMENT scopeValue must be DEV, STAGING or PROD',
      });
    }
  });

export const updateBudgetSchema = z.object({
  limitPerMonth: z.number().positive(),
});
