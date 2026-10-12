import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db } from './db/client';
import { userForToken, type UserRow } from './users';

/** Routes that work without signing in. */
const PUBLIC_ROUTES = new Set(['/health', '/auth/config', '/auth/register', '/auth/login']);

declare module 'fastify' {
  interface FastifyRequest {
    /** The signed-in account (set for every non-public route). */
    user: UserRow | null;
  }
}

export function bearerToken(req: FastifyRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
  return match?.[1]?.trim() || null;
}

/** The signed-in user of a route behind registerAuth. */
export function currentUser(req: FastifyRequest): UserRow {
  if (!req.user) throw Object.assign(new Error('Oturum açman gerekiyor.'), { statusCode: 401 });
  return req.user;
}

/** Every request except PUBLIC_ROUTES must carry a login token: `Authorization: Bearer <token>`. */
export function registerAuth(app: FastifyInstance, db: Db, now: () => number): void {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (req, reply) => {
    if (PUBLIC_ROUTES.has(req.routeOptions.url ?? '')) return;
    const token = bearerToken(req);
    const user = token ? userForToken(db, token, now()) : null;
    if (!user) return reply.code(401).send({ error: 'Oturumun kapanmış. Tekrar giriş yap.' });
    req.user = user;
  });
}
