import { asc, count, inArray } from 'drizzle-orm';
import { questionDto } from '../dto';
import type { Db } from './client';
import { attempts, questionMessages, questions, reviews } from './schema';

type QuestionRow = typeof questions.$inferSelect;

/** Loads attempts, review state and chat size for a batch of questions and builds their DTOs. */
export function hydrateQuestions(db: Db, rows: QuestionRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const attemptsById = new Map<string, (typeof attempts.$inferSelect)[]>();
  for (const a of db.select().from(attempts).where(inArray(attempts.questionId, ids)).orderBy(asc(attempts.createdAt)).all()) {
    const list = attemptsById.get(a.questionId) ?? [];
    list.push(a);
    attemptsById.set(a.questionId, list);
  }

  const reviewById = new Map(
    db.select().from(reviews).where(inArray(reviews.questionId, ids)).all().map((r) => [r.questionId, r]),
  );

  const messageCountById = new Map(
    db
      .select({ questionId: questionMessages.questionId, n: count() })
      .from(questionMessages)
      .where(inArray(questionMessages.questionId, ids))
      .groupBy(questionMessages.questionId)
      .all()
      .map((r) => [r.questionId, r.n]),
  );

  return rows.map((q) =>
    questionDto(q, {
      attempts: attemptsById.get(q.id),
      review: reviewById.get(q.id) ?? null,
      messageCount: messageCountById.get(q.id) ?? 0,
    }),
  );
}
