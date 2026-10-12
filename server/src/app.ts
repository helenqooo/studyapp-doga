import fs from 'node:fs';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { registerAuth } from './auth';
import type { Ai } from './claude/ai';
import type { Db } from './db/client';
import type { Env } from './env';
import { assistantRoutes } from './routes/assistant';
import { authRoutes } from './routes/auth';
import { examRoutes } from './routes/exams';
import { leaderboardRoutes } from './routes/leaderboard';
import { messageRoutes } from './routes/messages';
import { profileRoutes } from './routes/profile';
import { questionRoutes } from './routes/questions';
import { reviewRoutes } from './routes/reviews';
import { sessionRoutes } from './routes/sessions';
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
  registerAuth(app, deps.db, deps.now);

  app.setErrorHandler((err: { statusCode?: number; message?: string }, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status === 413) return reply.code(413).send({ error: 'Görsel çok büyük (en fazla 10 MB).' });
    if (status < 500) return reply.code(status).send({ error: err.message || 'Geçersiz istek.' });
    req.log.error(err);
    return reply.code(500).send({ error: 'Sunucu hatası.' });
  });

  app.get('/health', async () => ({ ok: true }));

  authRoutes(app, deps);
  profileRoutes(app, deps);
  solveRoutes(app, deps);
  questionRoutes(app, deps);
  reviewRoutes(app, deps);
  messageRoutes(app, deps);
  examRoutes(app, deps);
  statsRoutes(app, deps);
  sessionRoutes(app, deps);
  leaderboardRoutes(app, deps);
  assistantRoutes(app, deps);

  return app;
}
