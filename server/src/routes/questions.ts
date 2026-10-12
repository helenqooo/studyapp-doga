import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { and, count, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { hydrateQuestions } from '../db/hydrate';
import type { Db } from '../db/client';
import { attempts, questions, reviews } from '../db/schema';
import { attemptDto, profileDto } from '../dto';
import { applyRewards, XP } from '../gamification';
import { initialSchedule } from '../srs';
import { localDate } from '../time';

const ListQuery = z.object({
  subject: z.string().optional(),
  topicId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

const AttemptBody = z.object({
  result: z.enum(['correct', 'wrong', 'blank']),
  userAnswer: z.string().trim().max(200).nullish(),
  hintsUsed: z.number().int().min(0).max(10).default(0),
  viewedSolution: z.boolean().default(false),
});

export type IdParams = { Params: { id: string } };

/** The user's own question, or undefined (someone else's reads as not found). */
export function ownedQuestion(db: Db, id: string, userId: string) {
  return db
    .select()
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.userId, userId)))
    .get();
}

export function questionRoutes(app: FastifyInstance, { env, db, now }: AppDeps): void {
  // History list, newest first, filterable by subject and topic.
  app.get('/questions', async (req, reply) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz filtre.' });
    const { subject, topicId, limit, offset } = query.data;
    const user = currentUser(req);

    const filters = [eq(questions.userId, user.id)];
    if (subject) filters.push(eq(questions.subject, subject));
    if (topicId) filters.push(eq(questions.topicId, topicId));
    const where = and(...filters);

    const rows = db
      .select()
      .from(questions)
      .where(where)
      .orderBy(desc(questions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const total = db.select({ n: count() }).from(questions).where(where).get()?.n ?? 0;

    return { items: hydrateQuestions(db, rows), total, nextOffset: offset + rows.length < total ? offset + rows.length : null };
  });

  // Question counts per subject and topic, for the history filters.
  app.get('/questions/facets', async (req) => {
    const user = currentUser(req);
    const subjects = db
      .select({ subject: questions.subject, count: count() })
      .from(questions)
      .where(eq(questions.userId, user.id))
      .groupBy(questions.subject)
      .all();
    const topics = db
      .select({ topicId: questions.topicId, count: count() })
      .from(questions)
      .where(eq(questions.userId, user.id))
      .groupBy(questions.topicId)
      .all();
    return { total: subjects.reduce((sum, s) => sum + s.count, 0), subjects, topics };
  });

  app.get<IdParams>('/questions/:id', async (req, reply) => {
    const q = ownedQuestion(db, req.params.id, currentUser(req).id);
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });
    return hydrateQuestions(db, [q])[0];
  });

  app.get<IdParams>('/questions/:id/image', async (req, reply) => {
    const q = ownedQuestion(db, req.params.id, currentUser(req).id);
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });

    const filePath = path.join(env.imagesDir, path.basename(q.imageFile));
    try {
      await fs.access(filePath);
    } catch {
      return reply.code(404).send({ error: 'Görsel bulunamadı.' });
    }
    return reply
      .header('Content-Type', q.imageMime)
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(createReadStream(filePath));
  });

  // Records how the student did on a freshly solved question. Wrong/blank answers
  // enter the review queue; the first record earns solve XP.
  app.post<IdParams>('/questions/:id/attempt', async (req, reply) => {
    const body = AttemptBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz istek.' });

    const user = currentUser(req);
    const q = ownedQuestion(db, req.params.id, user.id);
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });

    const ts = now();
    const today = localDate(ts, env.APP_TIMEZONE);
    const result = db.transaction((tx) => {
      const existing = tx
        .select({ id: attempts.id })
        .from(attempts)
        .where(and(eq(attempts.questionId, q.id), eq(attempts.source, 'solve')))
        .get();
      if (existing) return null;

      const attempt = tx
        .insert(attempts)
        .values({
          id: randomUUID(),
          questionId: q.id,
          createdAt: ts,
          source: 'solve',
          result: body.data.result,
          userAnswer: body.data.userAnswer || null,
          hintsUsed: body.data.hintsUsed,
          viewedSolution: body.data.viewedSolution,
          userId: user.id,
        })
        .returning()
        .get();

      if (body.data.result !== 'correct') {
        const schedule = initialSchedule(today);
        tx.insert(reviews)
          .values({
            questionId: q.id,
            stage: schedule.stage,
            dueDate: schedule.dueDate,
            status: schedule.status,
            createdAt: ts,
            userId: user.id,
          })
          .onConflictDoNothing()
          .run();
      }

      const { rewards, profile } = applyRewards(tx, user.id, { xp: XP.solveQuestion, reason: 'solve', now: ts, today });
      return { attempt, rewards, profile };
    });

    if (!result) return reply.code(409).send({ error: 'Bu soru zaten işaretlendi.' });

    return reply.code(201).send({
      attempt: attemptDto(result.attempt),
      xpGained: result.rewards.xpGained,
      rewards: result.rewards,
      profile: profileDto(result.profile, today),
    });
  });
}
