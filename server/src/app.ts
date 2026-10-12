import fs from 'node:fs';
import multipart from '@fastify/multipart';
import { eq } from 'drizzle-orm';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { registerAuth } from './auth';
import type { Ai } from './claude/ai';
import type { Db } from './db/client';
import { profile } from './db/schema';
import { profileDto } from './dto';
import type { Env } from './env';
import { examRoutes } from './routes/exams';
import { messageRoutes } from './routes/messages';
import { questionRoutes } from './routes/questions';
import { reviewRoutes } from './routes/reviews';
import { solveRoutes } from './routes/solve';
import { statsRoutes } from './routes/stats';

export interface AppDeps {
  env: Env;
  db: Db;
  ai: Ai;
  /** Current time in ms; injectable so tests can move across days. */
  now: () => number;
}

export async function buildApp(input: Omit<AppDeps, 'now'> & { now?: AppDeps['now'] }, opts: FastifyServerOptions = {}) {
  const deps: AppDeps = { ...input, now: input.now ?? Date.now };
  fs.mkdirSync(deps.env.imagesDir, { recursive: true });

  const app = Fastify({ logger: true, ...opts });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 } });
  registerAuth(app, deps.env.APP_TOKEN);

  app.setErrorHandler((err: { statusCode?: number; message?: string }, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status === 413) return reply.code(413).send({ error: 'Görsel çok büyük (en fazla 10 MB).' });
    if (status < 500) return reply.code(status).send({ error: err.message || 'Geçersiz istek.' });
    req.log.error(err);
    return reply.code(500).send({ error: 'Sunucu hatası.' });
  });

  app.get('/health', async () => ({ ok: true }));

  app.get('/profile', async () => {
    const row = deps.db.select().from(profile).where(eq(profile.id, 1)).get();
    if (!row) throw new Error('profile row missing');
    return profileDto(row);
  });

  solveRoutes(app, deps);
  questionRoutes(app, deps);
  reviewRoutes(app, deps);
  messageRoutes(app, deps);
  examRoutes(app, deps);
  statsRoutes(app, deps);

  return app;
}
