import { Injectable } from '@nestjs/common';
import { z } from 'zod';

/**
 * Environment validation.
 *
 * Validated once at boot. Crashes early with a clear error if anything is
 * missing or malformed. Never read process.env directly anywhere else —
 * always inject AppConfig.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PREFIX: z.string().default('v1'),
  CORS_ORIGINS: z.string().default('*'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  SEED_DEMO_USER: z.coerce.boolean().default(false),
  DEMO_USER_EMAIL: z.string().email().optional(),
  DEMO_USER_PASSWORD: z.string().min(10).optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }
  cachedEnv = result.data;
  return cachedEnv;
}

@Injectable()
export class AppConfig {
  readonly env: AppEnv = loadEnv();

  get isProd(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isDev(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get corsOrigins(): string[] | string {
    if (this.env.CORS_ORIGINS === '*') return '*';
    return this.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  }
}
