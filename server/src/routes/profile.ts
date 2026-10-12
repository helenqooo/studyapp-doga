import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { profiles } from '../db/schema';
import { profileDto } from '../dto';
import { localDate } from '../time';

const SettingsBody = z.object({
  focusMinutes: z.number().int().min(5).max(90),
  breakMinutes: z.number().int().min(1).max(30),
});

export function profileRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  app.get('/profile', async (req) => {
    const row = db.select().from(profiles).where(eq(profiles.userId, currentUser(req).id)).get();
    if (!row) throw new Error('profile missing');
    return profileDto(row, localDate(now(), env.APP_TIMEZONE));
  });

  // Pomodoro lengths.
  app.put('/profile/settings', async (req, reply) => {
    const body = SettingsBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Odak 5–90, mola 1–30 dakika olmalı.' });
    const row = db
      .update(profiles)
      .set({ settings: body.data })
      .where(eq(profiles.userId, currentUser(req).id))
      .returning()
      .get();
    if (!row) throw new Error('profile missing');
    return profileDto(row, localDate(now(), env.APP_TIMEZONE));
  });
}
