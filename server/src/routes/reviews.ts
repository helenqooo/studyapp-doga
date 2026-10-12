import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { hydrateQuestions } from '../db/hydrate';
import { attempts, profile, questions, reviews } from '../db/schema';
import { attemptDto, profileDto, reviewDto } from '../dto';
import { XP } from '../gamification';
import { nextSchedule } from '../srs';
import { localDate } from '../time';
import type { IdParams } from './questions';

const ResultBody = z.object({
  result: z.enum(['correct', 'wrong']),
  viewedSolution: z.boolean().default(false),
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function reviewRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  // Everything due today or overdue, oldest due first.
  app.get('/reviews/today', async () => {
    const ts = now();
    const today = localDate(ts, env.APP_TIMEZONE);

    const rows = db
      .select({ question: questions })
      .from(reviews)
      .innerJoin(questions, eq(reviews.questionId, questions.id))
      .where(and(eq(reviews.status, 'active'), lte(reviews.dueDate, today)))
      .orderBy(asc(reviews.dueDate), asc(reviews.createdAt))
      .all();

    // Reviews answered today (they have already moved to a future due date).
    const completedToday = db
      .select({ at: reviews.lastReviewedAt })
      .from(reviews)
      .where(gte(reviews.lastReviewedAt, ts - 2 * DAY_MS))
      .all()
      .filter((r) => r.at !== null && localDate(r.at, env.APP_TIMEZONE) === today).length;

    return { today, items: hydrateQuestions(db, rows.map((r) => r.question)), completedToday };
  });

  // Applies a review answer: correct moves up the interval ladder, wrong starts over.
  app.post<IdParams>('/reviews/:id/result', async (req, reply) => {
    const body = ResultBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz istek.' });

    const ts = now();
    const today = localDate(ts, env.APP_TIMEZONE);
    const correct = body.data.result === 'correct';

    const outcome = db.transaction((tx) => {
      const review = tx.select().from(reviews).where(eq(reviews.questionId, req.params.id)).get();
      if (!review) return { error: 404 as const, message: 'Bu soru tekrar listende değil.' };
      if (review.status !== 'active' || review.dueDate > today) {
        return { error: 409 as const, message: 'Bu sorunun tekrar zamanı henüz gelmedi.' };
      }

      const schedule = nextSchedule(review.stage, correct, today);
      const updated = tx
        .update(reviews)
        .set({
          stage: schedule.stage,
          dueDate: schedule.dueDate,
          status: schedule.status,
          correctCount: correct ? review.correctCount + 1 : review.correctCount,
          lastResult: body.data.result,
          lastReviewedAt: ts,
        })
        .where(eq(reviews.questionId, review.questionId))
        .returning()
        .get();

      const attempt = tx
        .insert(attempts)
        .values({
          id: randomUUID(),
          questionId: review.questionId,
          createdAt: ts,
          source: 'review',
          result: body.data.result,
          viewedSolution: body.data.viewedSolution,
        })
        .returning()
        .get();

      const xpGained = correct ? XP.reviewCorrect : 0;
      const updatedProfile = tx
        .update(profile)
        .set({ xp: sql`${profile.xp} + ${xpGained}` })
        .where(eq(profile.id, 1))
        .returning()
        .get();

      return { review: updated, attempt, xpGained, profile: updatedProfile };
    });

    if (outcome.error) return reply.code(outcome.error).send({ error: outcome.message });

    return {
      review: reviewDto(outcome.review),
      attempt: attemptDto(outcome.attempt),
      xpGained: outcome.xpGained,
      profile: profileDto(outcome.profile),
    };
  });
}
