import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { and, asc, count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { AiError } from '../claude/client';
import { questionMessages, questions } from '../db/schema';
import { messageDto } from '../dto';
import type { IdParams } from './questions';

/** "Kısa bir sohbet": cap follow-up questions per solved question. */
export const MAX_USER_MESSAGES = 10;

const MessageBody = z.object({ content: z.string().trim().min(1).max(2000) });

export function messageRoutes(app: FastifyInstance, { env, db, tutor, now }: AppDeps): void {
  app.get<IdParams>('/questions/:id/messages', async (req, reply) => {
    const q = db.select({ id: questions.id }).from(questions).where(eq(questions.id, req.params.id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });
    const rows = db
      .select()
      .from(questionMessages)
      .where(eq(questionMessages.questionId, q.id))
      .orderBy(asc(questionMessages.createdAt))
      .all();
    return { items: rows.map(messageDto), limit: MAX_USER_MESSAGES };
  });

  // Sends a follow-up ("Anlamadım") question and returns the student's message and the reply.
  app.post<IdParams>('/questions/:id/messages', async (req, reply) => {
    const body = MessageBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Mesaj boş olamaz (en fazla 2000 karakter).' });

    const q = db.select().from(questions).where(eq(questions.id, req.params.id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı.' });

    const sent =
      db
        .select({ n: count() })
        .from(questionMessages)
        .where(and(eq(questionMessages.questionId, q.id), eq(questionMessages.role, 'user')))
        .get()?.n ?? 0;
    if (sent >= MAX_USER_MESSAGES) {
      return reply.code(409).send({ error: `Bu soru için en fazla ${MAX_USER_MESSAGES} soru sorabilirsin.` });
    }

    const history = db
      .select({ role: questionMessages.role, content: questionMessages.content })
      .from(questionMessages)
      .where(eq(questionMessages.questionId, q.id))
      .orderBy(asc(questionMessages.createdAt))
      .all();

    let image: Buffer;
    try {
      image = await fs.readFile(path.join(env.imagesDir, path.basename(q.imageFile)));
    } catch {
      return reply.code(404).send({ error: 'Sorunun görseli bulunamadı.' });
    }

    let answer: string;
    try {
      answer = await tutor.reply({ question: q, image, history, message: body.data.content });
    } catch (err) {
      if (err instanceof AiError) {
        req.log.warn({ err }, 'tutor failed');
        return reply.code(502).send({ error: err.message });
      }
      throw err;
    }

    // Both turns are stored only after a successful reply, so a failure leaves no orphan.
    const ts = now();
    const [userMessage, assistantMessage] = db.transaction((tx) => [
      tx
        .insert(questionMessages)
        .values({ id: randomUUID(), questionId: q.id, role: 'user', content: body.data.content, createdAt: ts })
        .returning()
        .get(),
      tx
        .insert(questionMessages)
        .values({ id: randomUUID(), questionId: q.id, role: 'assistant', content: answer, createdAt: ts + 1 })
        .returning()
        .get(),
    ]);

    return reply.code(201).send({ userMessage: messageDto(userMessage!), assistantMessage: messageDto(assistantMessage!) });
  });
}
