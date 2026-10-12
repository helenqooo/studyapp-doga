import fs from 'node:fs';
import multipart from '@fastify/multipart';
import { eq } from 'drizzle-orm';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { registerAuth } from './auth';
import type { Solver } from './claude/solver';
import type { Db } from './db/client';
import { profile } from './db/schema';
import { profileDto } from './dto';
import type { Env } from './env';
import { questionRoutes } from './routes/questions';
import { solveRoutes } from './routes/solve';

export interface AppDeps {
  env: Env;
  db: Db;
  solver: Solver;
}

export async function buildApp(deps: AppDeps, opts: FastifyServerOptions = {}) {
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

  return app;
}
