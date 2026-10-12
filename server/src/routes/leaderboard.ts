import { gte, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { profiles, users, xpEvents } from '../db/schema';
import { effectiveStreak, levelFromXp } from '../gamification';
import { weekStart } from '../stats';
import { localDate } from '../time';

const Query = z.object({ period: z.enum(['week', 'all']).default('week') });

export function leaderboardRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  // Everyone on this server ranked by XP: this week's (from Monday) or all time.
  app.get('/leaderboard', async (req, reply) => {
    const query = Query.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz dönem.' });
    const me = currentUser(req);
    const today = localDate(now(), env.APP_TIMEZONE);
    const week = weekStart(today);

    const weekly = new Map(
      db
        .select({ userId: xpEvents.userId, xp: sql<number>`sum(${xpEvents.amount})` })
        .from(xpEvents)
        .where(gte(xpEvents.date, week))
        .groupBy(xpEvents.userId)
        .all()
        .map((r) => [r.userId, Number(r.xp)]),
    );

    const rows = db
      .select({ user: users, profile: profiles })
      .from(users)
      .innerJoin(profiles, sql`${profiles.userId} = ${users.id}`)
      .all()
      .map(({ user, profile }) => ({
        userId: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        level: levelFromXp(profile.xp).level,
        streak: effectiveStreak(profile.currentStreak, profile.lastStreakDate, today),
        xp: query.data.period === 'week' ? (weekly.get(user.id) ?? 0) : profile.xp,
        isMe: user.id === me.id,
      }))
      .sort((a, b) => b.xp - a.xp || a.displayName.localeCompare(b.displayName, 'tr'));

    // Equal XP shares a rank (1, 2, 2, 4).
    let rank = 0;
    const items = rows.map((r, i) => {
      if (i === 0 || r.xp !== rows[i - 1]!.xp) rank = i + 1;
      return { rank, ...r };
    });

    return { period: query.data.period, weekStart: week, items };
  });
}
