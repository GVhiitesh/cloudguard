import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 chars'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  IDLE_CPU_THRESHOLD: z.coerce.number().default(5),
  IDLE_WINDOW_DAYS: z.coerce.number().int().positive().default(10),
  ANOMALY_WINDOW_DAYS: z.coerce.number().int().positive().default(14),
  /** Absolute jump (in the metric's own unit) required before a spike can fire. */
  ANOMALY_MIN_ABS_DELTA: z.coerce.number().default(20),
  /** How many consecutive idle days before IDLE auto-escalates to FLAGGED. */
  IDLE_FLAG_AFTER_DAYS: z.coerce.number().int().positive().default(15),

  SIMULATOR_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail loud and early: a half-configured server is worse than no server.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
