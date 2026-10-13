import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { attempts, sessions } from '../db/schema';
import { profileDto } from '../dto';
import { applyRewards, XP } from '../gamification';
import { addDays, localDate } from '../time';
import { SUBJECTS_BY_EXAM } from '../topics';

const SUBJECTS = new Set<string>(Object.values(SUBJECTS_BY_EXAM).flat());
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A focus session must last this long to count (XP, streak). */
export const MIN_COUNTED_FOCUS_SEC = 5 * 60;
const MAX_SESSION_SEC = 4 * 60 * 60;

const SessionBody = z.object({
  /** Client-made id, so a retried upload doesn't count twice. */
  id: z.string().uuid(),
  kind: z.enum(['focus', 'break']),
  subject: z.string().nullish(),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  completed: z.boolean(),
});

type SessionRow = typeof sessions.$inferSelect;

const sessionDto = (s: SessionRow) => ({
  id: s.id,
  kind: s.kind,
  subject: s.subject,
  startedAt: new Date(s.startedAt).toISOString(),
  endedAt: new Date(s.endedAt).toISOString(),
  durationSec: s.durationSec,
  completed: s.completed,
  date: s.date,
});

export function sessionRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  // Saves a finished (or stopped) timer session. A completed focus session of at least
  // 5 minutes earns pomodoro XP and counts the day toward the streak.
  app.post('/sessions', async (req, reply) => {
    const body = SessionBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Oturum bilgileri hatalı.' });
    const { id, kind, startedAt, endedAt, completed } = body.data;
    const subject = body.data.subject ?? null;
    const user = currentUser(req);
    const ts = now();

    if (subject && !SUBJECTS.has(subject)) return reply.code(400).send({ error: 'Geçersiz ders.' });
    const durationSec = Math.round((endedAt - startedAt) / 1000);
    if (durationSec <= 0 || durationSec > MAX_SESSION_SEC || endedAt > ts + 5 * 60 * 1000 || startedAt < ts - 2 * 24 * 60 * 60 * 1000) {
      return reply.code(400).send({ error: 'Oturum süresi geçersiz.' });
    }

    const existing = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (existing) {
      if (existing.userId !== user.id) return reply.code(409).send({ error: 'Oturum zaten kayıtlı.' });
      return { session: sessionDto(existing), rewards: null, duplicate: true };
    }

    const today = localDate(ts, env.APP_TIMEZONE);
    const counts = kind === 'focus' && completed && durationSec >= MIN_COUNTED_FOCUS_SEC;
    const result = db.transaction((tx) => {
      const row = tx
        .insert(sessions)
        .values({
          id,
          kind,
          subject,
          startedAt,
          endedAt,
          durationSec,
          completed,
          date: localDate(startedAt, env.APP_TIMEZONE),
          userId: user.id,
        })
        .returning()
        .get();
      const { rewards, profile } = applyRewards(tx, user.id, {
        xp: counts ? XP.pomodoroComplete : 0,
        reason: 'pomodoro',
        now: ts,
        today,
        streakDay: counts,
      });
      return { row, rewards, profile };
    });

    return reply.code(201).send({
      session: sessionDto(result.row),
      rewards: result.rewards,
      profile: profileDto(result.profile, today),
    });
  });

  const DayQuery = z.object({ date: z.string().regex(DAY_RE).optional() });

  /** Questions photographed and answered on a local date (their first attempt). */
  const solvedOn = (userId: string, date: string) => {
    // A window wide enough for any time zone, narrowed by the local date.
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    const from = Date.UTC(y, m - 1, d) - 15 * 60 * 60 * 1000;
    const to = from + 54 * 60 * 60 * 1000;
    return db
      .select({ createdAt: attempts.createdAt })
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.source, 'solve'), gte(attempts.createdAt, from), lte(attempts.createdAt, to)))
      .all()
      .filter((a) => localDate(a.createdAt, env.APP_TIMEZONE) === date).length;
  };

  // One day's sessions with the focus total and the split by subject, plus how many
  // questions were solved that day (for Home's rings).
  app.get('/sessions', async (req, reply) => {
    const query = DayQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Tarih YYYY-AA-GG olmalı.' });
    const user = currentUser(req);
    const date = query.data.date ?? localDate(now(), env.APP_TIMEZONE);
    const rows = db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), eq(sessions.date, date)))
      .orderBy(asc(sessions.startedAt))
      .all();
    const focus = rows.filter((s) => s.kind === 'focus');
    const bySubject = new Map<string, number>();
    for (const s of focus) bySubject.set(s.subject ?? '', (bySubject.get(s.subject ?? '') ?? 0) + s.durationSec);
    return {
      date,
      items: rows.map(sessionDto),
      focusSec: focus.reduce((sum, s) => sum + s.durationSec, 0),
      pomodoros: focus.filter((s) => s.completed && s.durationSec >= MIN_COUNTED_FOCUS_SEC).length,
      bySubject: [...bySubject]
        .map(([subject, seconds]) => ({ subject: subject || null, seconds }))
        .sort((a, b) => b.seconds - a.seconds),
      solved: solvedOn(user.id, date),
    };
  });

  const DaysQuery = z.object({ days: z.coerce.number().int().min(1).max(60).default(7) });

  // Focus seconds per day for the last N days (oldest first), for the week chart.
  app.get('/sessions/days', async (req, reply) => {
    const query = DaysQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz istek.' });
    const user = currentUser(req);
    const today = localDate(now(), env.APP_TIMEZONE);
    const from = addDays(today, -(query.data.days - 1));
    const rows = db
      .select({ date: sessions.date, durationSec: sessions.durationSec })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), eq(sessions.kind, 'focus'), gte(sessions.date, from), lte(sessions.date, today)))
      .all();
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.date, (totals.get(r.date) ?? 0) + r.durationSec);
    return {
      days: Array.from({ length: query.data.days }, (_, i) => {
        const date = addDays(from, i);
        return { date, focusSec: totals.get(date) ?? 0 };
      }),
    };
  });
}
