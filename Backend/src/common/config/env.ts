import { z } from 'zod';

/** Validated environment. Fail fast at boot if misconfigured. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // 'redis' = real Redis (Docker); 'memory' = in-process shim (no-Docker dev mode).
  REDIS_DRIVER: z.enum(['redis', 'memory']).default('redis'),
  SESSION_COOKIE_NAME: z.string().default('aurum_session'),
  SESSION_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_SECRET: z.string().min(8).default('dev-only-cookie-secret-change-me'),
  TOTP_ISSUER: z.string().default('Aurum Markets'),
  // Demo-first safety flags — real money stays off until a licence exists.
  LIVE_TRADING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LIVE_PAYMENTS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
