import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors';

export interface ValidationTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and REPLACES req.body/query/params with the parsed result, so
 * downstream handlers get coerced, defaulted, typed values.
 */
export function validate(schemas: ValidationTargets | AnyZodObject) {
  const targets: ValidationTargets =
    'body' in schemas || 'query' in schemas || 'params' in schemas
      ? (schemas as ValidationTargets)
      : { body: schemas as ZodTypeAny };

  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const key of ['body', 'query', 'params'] as const) {
      const schema = targets[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const fields = result.error.issues.map((i) => ({
          field: i.path.join('.') || key,
          message: i.message,
        }));
        return next(new AppError(400, `Validation failed for request ${key}`, fields));
      }
      // req.query/params have getter-only descriptors in some Express versions.
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}
