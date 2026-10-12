import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { bearerToken, currentUser } from '../auth';
import { profiles, users } from '../db/schema';
import { profileDto } from '../dto';
import { localDate } from '../time';
import {
  AVATARS,
  createUser,
  DISPLAY_NAME_MAX,
  dummyPasswordHash,
  hashPassword,
  issueToken,
  LoginLimiter,
  normalizeUsername,
  PASSWORD_MIN,
  revokeToken,
  USERNAME_RE,
  userCount,
  userDto,
  verifyPassword,
} from '../users';

const RegisterBody = z.object({
  username: z.string(),
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX),
  password: z.string().min(PASSWORD_MIN).max(200),
  inviteCode: z.string().trim().optional(),
  avatar: z.enum(AVATARS).optional(),
});

const LoginBody = z.object({ username: z.string().max(64), password: z.string().max(200) });

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function authRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  const limiter = new LoginLimiter();
  const inviteLimiter = new LoginLimiter();
  const TOO_MANY = 'Çok fazla deneme yapıldı. 15 dakika sonra tekrar dene.';

  /** Who may register: the first account always; later ones only with INVITE_CODE. */
  const registration = () => {
    const first = userCount(db) === 0;
    return { open: first || !!env.INVITE_CODE, inviteRequired: !first && !!env.INVITE_CODE, first };
  };

  app.get('/auth/config', async () => {
    const r = registration();
    return { registrationOpen: r.open, inviteRequired: r.inviteRequired };
  });

  app.post('/auth/register', async (req, reply) => {
    const body = RegisterBody.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: `Bilgiler eksik: görünen ad 1–${DISPLAY_NAME_MAX} karakter, şifre en az ${PASSWORD_MIN} karakter olmalı.`,
      });
    }
    const username = normalizeUsername(body.data.username);
    if (!USERNAME_RE.test(username)) {
      return reply.code(400).send({ error: 'Kullanıcı adı 3–20 karakter olmalı: küçük harf, rakam, alt çizgi ya da nokta.' });
    }
    const r = registration();
    if (!r.open) return reply.code(403).send({ error: 'Kayıt kapalı. Sunucu sahibinden davet kodu iste.' });
    if (r.inviteRequired) {
      const key = `invite|${req.ip}`;
      const ts = now();
      if (inviteLimiter.blocked(key, ts)) return reply.code(429).send({ error: TOO_MANY });
      if (!sameSecret(body.data.inviteCode ?? '', env.INVITE_CODE ?? '')) {
        inviteLimiter.fail(key, ts);
        return reply.code(403).send({ error: 'Davet kodu yanlış.' });
      }
    }
    if (db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()) {
      return reply.code(409).send({ error: 'Bu kullanıcı adı alınmış.' });
    }

    const ts = now();
    const user = createUser(
      db,
      { username, displayName: body.data.displayName, passwordHash: await hashPassword(body.data.password), avatar: body.data.avatar ?? 'clay' },
      ts,
    );
    const token = issueToken(db, user.id, ts);
    return reply.code(201).send({ token, user: userDto(user) });
  });

  app.post('/auth/login', async (req, reply) => {
    const body = LoginBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Kullanıcı adı ve şifre gerekli.' });
    const username = normalizeUsername(body.data.username);
    const wrong = { error: 'Kullanıcı adı ya da şifre yanlış.' };
    // No account can have such a name; answer without tracking it, so keys stay short.
    if (!USERNAME_RE.test(username)) return reply.code(401).send(wrong);
    const key = `${req.ip}|${username}`;
    const ts = now();
    if (limiter.blocked(key, ts)) return reply.code(429).send({ error: TOO_MANY });
    // Counted before the slow password check, so parallel guesses can't all slip through.
    limiter.fail(key, ts);

    const user = db.select().from(users).where(eq(users.username, username)).get();
    const ok = await verifyPassword(body.data.password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !ok) return reply.code(401).send(wrong);
    limiter.reset(key);
    return { token: issueToken(db, user.id, ts), user: userDto(user) };
  });

  app.post('/auth/logout', async (req, reply) => {
    const token = bearerToken(req);
    if (token) revokeToken(db, token);
    return reply.code(204).send();
  });

  app.get('/me', async (req) => {
    const user = currentUser(req);
    const row = db.select().from(profiles).where(eq(profiles.userId, user.id)).get();
    if (!row) throw new Error('profile missing');
    return { user: userDto(user), profile: profileDto(row, localDate(now(), env.APP_TIMEZONE)) };
  });

  const MeBody = z.object({
    displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX).optional(),
    avatar: z.enum(AVATARS).optional(),
  });

  app.put('/me', async (req, reply) => {
    const body = MeBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz bilgi.' });
    const user = currentUser(req);
    const updated = db.update(users).set(body.data).where(eq(users.id, user.id)).returning().get();
    return { user: userDto(updated ?? user) };
  });
}
