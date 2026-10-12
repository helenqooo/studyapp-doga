import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

const PUBLIC_ROUTES = new Set(['/health']);

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Single-user auth: every request except PUBLIC_ROUTES must send `Authorization: Bearer <APP_TOKEN>`. */
export function registerAuth(app: FastifyInstance, appToken: string): void {
  const expected = digest(appToken);

  app.addHook('onRequest', async (req, reply) => {
    if (PUBLIC_ROUTES.has(req.routeOptions.url ?? '')) return;

    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1] || !timingSafeEqual(digest(match[1].trim()), expected)) {
      return reply.code(401).send({ error: 'Yetkisiz istek. APP_TOKEN değerini kontrol et.' });
    }
  });
}
