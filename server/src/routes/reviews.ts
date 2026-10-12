import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, gte, lte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { hydrateQuestions } from '../db/hydrate';
import { attempts, questions, reviews } from '../db/schema';
import { attemptDto, profileDto, reviewDto } from '../dto';
import { applyRewards, XP } from '../gamification';
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
  app.get('/reviews/today', async (req) => {
    const user = currentUser(req);
    const ts = now();
    const today = localDate(ts, env.APP_TIMEZONE);

    const rows = db
      .select({ question: questions })
      .from(reviews)
      .innerJoin(questions, eq(reviews.questionId, questions.id))
      .where(and(eq(reviews.userId, user.id), eq(reviews.status, 'active'), lte(reviews.dueDate, today)))
      .orderBy(asc(reviews.dueDate), asc(reviews.createdAt))
      .all();

    // Reviews answered today (they have already moved to a future due date).
    const completedToday = db
      .select({ at: reviews.lastReviewedAt })
      .from(reviews)
      .where(and(eq(reviews.userId, user.id), gte(reviews.lastReviewedAt, ts - 2 * DAY_MS)))
      .all()
      .filter((r) => r.at !== null && localDate(r.at, env.APP_TIMEZONE) === today).length;

    return { today, items: hydrateQuestions(db, rows.map((r) => r.question)), completedToday };
  });

  // Applies a review answer: correct moves up the interval ladder, wrong starts over.
  app.post<IdParams>('/reviews/:id/result', async (req, reply) => {
    const body = ResultBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz istek.' });

    const user = currentUser(req);
    const ts = now();
    const today = localDate(ts, env.APP_TIMEZONE);
    const correct = body.data.result === 'correct';

    const outcome = db.transaction((tx) => {
      const review = tx
        .select()
        .from(reviews)
        .where(and(eq(reviews.questionId, req.params.id), eq(reviews.userId, user.id)))
        .get();
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
          userId: user.id,
        })
        .returning()
        .get();

      // Clearing today's queue counts toward the streak.
      const stillDue =
        tx
          .select({ n: count() })
          .from(reviews)
          .where(and(eq(reviews.userId, user.id), eq(reviews.status, 'active'), lte(reviews.dueDate, today)))
          .get()?.n ?? 0;

      const { rewards, profile } = applyRewards(tx, user.id, {
        xp: correct ? XP.reviewCorrect : 0,
        reason: 'review',
        now: ts,
        today,
        streakDay: stillDue === 0,
      });
      return { review: updated, attempt, rewards, profile };
    });

    if (outcome.error) return reply.code(outcome.error).send({ error: outcome.message });

    return {
      review: reviewDto(outcome.review),
      attempt: attemptDto(outcome.attempt),
      xpGained: outcome.rewards.xpGained,
      rewards: outcome.rewards,
      profile: profileDto(outcome.profile, today),
    };
  });
}
