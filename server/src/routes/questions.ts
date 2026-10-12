import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { attempts, profile, questions, reviews } from '../db/schema';
import { attemptDto, profileDto, questionDto } from '../dto';
import { REVIEW_INTERVALS, XP } from '../gamification';
import { addDays, localDate } from '../time';

const ListQuery = z.object({
  subject: z.string().optional(),
  topicId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AttemptBody = z.object({
  result: z.enum(['correct', 'wrong', 'blank']),
  userAnswer: z.string().trim().max(200).nullish(),
  hintsUsed: z.number().int().min(0).max(10).default(0),
  viewedSolution: z.boolean().default(false),
});

type IdParams = { Params: { id: string } };

export function questionRoutes(app: FastifyInstance, { env, db }: AppDeps): void {
  app.get('/questions', async (req, reply) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz filtre.' });
    const { subject, topicId, limit, offset } = query.data;

    const filters = [];
    if (subject) filters.push(eq(questions.subject, subject));
    if (topicId) filters.push(eq(questions.topicId, topicId));

    const rows = db
      .select()
      .from(questions)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(questions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const attemptsByQuestion = new Map<string, (typeof attempts.$inferSelect)[]>();
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const all = db
        .select()
        .from(attempts)
        .where(inArray(attempts.questionId, ids))
        .orderBy(asc(attempts.createdAt))
        .all();
      for (const a of all) {
        const list = attemptsByQuestion.get(a.questionId) ?? [];
        list.push(a);
        attemptsByQuestion.set(a.questionId, list);
      }
    }
    return { items: rows.map((r) => questionDto(r, attemptsByQuestion.get(r.id))) };
  });

  app.get<IdParams>('/questions/:id', async (req, reply) => {
    const q = db.select().from(questions).where(eq(questions.id, req.params.id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });
    const list = db
      .select()
      .from(attempts)
      .where(eq(attempts.questionId, q.id))
      .orderBy(asc(attempts.createdAt))
      .all();
    return questionDto(q, list);
  });

  app.get<IdParams>('/questions/:id/image', async (req, reply) => {
    const q = db
      .select({ imageFile: questions.imageFile, imageMime: questions.imageMime })
      .from(questions)
      .where(eq(questions.id, req.params.id))
      .get();
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

    const q = db.select({ id: questions.id }).from(questions).where(eq(questions.id, req.params.id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });

    const now = Date.now();
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
          createdAt: now,
          source: 'solve',
          result: body.data.result,
          userAnswer: body.data.userAnswer || null,
          hintsUsed: body.data.hintsUsed,
          viewedSolution: body.data.viewedSolution,
        })
        .returning()
        .get();

      if (body.data.result !== 'correct') {
        tx.insert(reviews)
          .values({
            questionId: q.id,
            stage: 0,
            dueDate: addDays(localDate(now, env.APP_TIMEZONE), REVIEW_INTERVALS[0]),
            createdAt: now,
          })
          .onConflictDoNothing()
          .run();
      }

      const updatedProfile = tx
        .update(profile)
        .set({ xp: sql`${profile.xp} + ${XP.solveQuestion}` })
        .where(eq(profile.id, 1))
        .returning()
        .get();

      return { attempt, updatedProfile };
    });

    if (!result) return reply.code(409).send({ error: 'Bu soru zaten işaretlendi.' });

    return reply.code(201).send({
      attempt: attemptDto(result.attempt),
      xpGained: XP.solveQuestion,
      profile: profileDto(result.updatedProfile),
    });
  });
}
