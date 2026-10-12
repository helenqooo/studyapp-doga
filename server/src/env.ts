import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const boolFromString = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z
  .object({
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(3000),
    /** Lets friends create accounts (the first account never needs it). Empty = sign-up closed after the first. */
    INVITE_CODE: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined))
      .refine((v) => v === undefined || v.length >= 12, 'INVITE_CODE must be at least 12 characters'),
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_MODEL: z.string().min(1).default('claude-sonnet-5-5'),
    AI_EFFORT: z
      .enum(['low', 'medium', 'high', 'xhigh', 'max', ''])
      .optional()
      .transform((v) => (v ? v : undefined)),
    APP_TIMEZONE: z.string().default('Europe/Istanbul'),
    DATA_DIR: z.string().optional(),
    MOCK_SOLVER: boolFromString,
  })
  .refine((e) => e.MOCK_SOLVER || !!e.ANTHROPIC_API_KEY, {
    message: 'ANTHROPIC_API_KEY is required unless MOCK_SOLVER=true',
    path: ['ANTHROPIC_API_KEY'],
  });

export type Env = z.infer<typeof EnvSchema> & { dataDir: string; imagesDir: string; dbFile: string };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment (see server/.env.example):\n${issues}`);
  }
  const dataDir = path.resolve(SERVER_ROOT, parsed.data.DATA_DIR ?? 'data');
  return {
    ...parsed.data,
    dataDir,
    imagesDir: path.join(dataDir, 'images'),
    dbFile: path.join(dataDir, 'derece.db'),
  };
}
