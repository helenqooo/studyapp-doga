import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { AiError } from '../claude/client';
import { weeklySummaries } from '../db/schema';
import { computeOverview, weekStart } from '../stats';

const SummaryQuery = z.object({ refresh: z.enum(['true', 'false']).optional() });

export function statsRoutes(app: FastifyInstance, { env, db, ai, now }: AppDeps): void {
  app.get('/stats/overview', async (req) => computeOverview(db, currentUser(req).id, now(), env.APP_TIMEZONE));

  // This week's AI priorities: generated once per week and cached; ?refresh=true regenerates.
  app.get('/stats/weekly-summary', async (req, reply) => {
    const query = SummaryQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz istek.' });

    const user = currentUser(req);
    const ts = now();
    const overview = computeOverview(db, user.id, ts, env.APP_TIMEZONE);
    const week = weekStart(overview.today);

    if (query.data.refresh !== 'true') {
      const cached = db
        .select()
        .from(weeklySummaries)
        .where(and(eq(weeklySummaries.userId, user.id), eq(weeklySummaries.weekStart, week)))
        .get();
      if (cached) {
        return {
          status: 'ok' as const,
          weekStart: cached.weekStart,
          generatedAt: new Date(cached.createdAt).toISOString(),
          summary: cached.summary,
          priorities: cached.priorities,
        };
      }
    }

    const examCount = overview.byExam.TYT.count + overview.byExam.AYT.count;
    if (examCount === 0 && overview.practice.attempts < 3) {
      return { status: 'insufficient' as const };
    }

    let content;
    try {
      content = await ai.coach.weeklySummary(overview);
    } catch (err) {
      if (err instanceof AiError) {
        req.log.warn({ err }, 'weekly summary failed');
        return reply.code(502).send({ error: err.message });
      }
      throw err;
    }

    const fields = { createdAt: ts, summary: content.summary, priorities: content.priorities };
    db.insert(weeklySummaries)
      .values({ userId: user.id, weekStart: week, ...fields })
      .onConflictDoUpdate({ target: [weeklySummaries.userId, weeklySummaries.weekStart], set: fields })
      .run();

    return { status: 'ok' as const, weekStart: week, generatedAt: new Date(ts).toISOString(), ...content };
  });
}
