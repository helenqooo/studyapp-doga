import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { currentUser } from '../auth';
import { AiError } from '../claude/client';
import { assistantMessages } from '../db/schema';
import { openStream, wantsStream } from '../stream';
import { studentContext } from '../studentContext';

/** Messages the student can send per day (keeps the API bill predictable). */
export const ASSISTANT_DAILY_LIMIT = 60;
/** How much earlier conversation the model sees. */
const HISTORY_TURNS = 24;
const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const MessageBody = z.object({ content: z.string().trim().min(1).max(2000) });

type Row = typeof assistantMessages.$inferSelect;
const dto = (m: Row) => ({ id: m.id, role: m.role, content: m.content, createdAt: new Date(m.createdAt).toISOString() });

export function assistantRoutes(app: FastifyInstance, { env, db, ai, now }: AppDeps): void {
  const sentLastDay = (userId: string) =>
    db
      .select({ n: count() })
      .from(assistantMessages)
      .where(and(eq(assistantMessages.userId, userId), eq(assistantMessages.role, 'user'), gte(assistantMessages.createdAt, now() - DAY_MS)))
      .get()?.n ?? 0;

  // The latest messages, oldest first.
  app.get('/assistant/messages', async (req) => {
    const user = currentUser(req);
    const rows = db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.userId, user.id))
      .orderBy(desc(assistantMessages.createdAt))
      .limit(PAGE)
      .all()
      .reverse();
    return { items: rows.map(dto), remainingToday: Math.max(0, ASSISTANT_DAILY_LIMIT - sentLastDay(user.id)) };
  });

  // Starts a fresh conversation.
  app.delete('/assistant/messages', async (req, reply) => {
    db.delete(assistantMessages).where(eq(assistantMessages.userId, currentUser(req).id)).run();
    return reply.code(204).send();
  });

  // Sends a message; the reply streams as NDJSON when asked for (see src/stream.ts).
  app.post('/assistant/messages', async (req, reply) => {
    const body = MessageBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Mesaj boş olamaz (en fazla 2000 karakter).' });
    const user = currentUser(req);
    if (sentLastDay(user.id) >= ASSISTANT_DAILY_LIMIT) {
      return reply.code(429).send({ error: `Bugünlük mesaj hakkın doldu (${ASSISTANT_DAILY_LIMIT}). Yarın yine konuşalım!` });
    }

    const history = db
      .select({ role: assistantMessages.role, content: assistantMessages.content })
      .from(assistantMessages)
      .where(eq(assistantMessages.userId, user.id))
      .orderBy(desc(assistantMessages.createdAt))
      .limit(HISTORY_TURNS)
      .all()
      .reverse();
    // The model expects the conversation to start with the student.
    while (history.length && history[0]!.role !== 'user') history.shift();

    const context = studentContext(db, user.id, now(), env.APP_TIMEZONE);
    const stream = wantsStream(req) ? openStream(reply) : null;

    let answer: string;
    try {
      answer = await ai.assistant.reply({
        context,
        history,
        message: body.data.content,
        onText: stream ? (text) => stream.send({ type: 'delta', text }) : undefined,
      });
    } catch (err) {
      const message = err instanceof AiError ? err.message : 'Sunucu hatası.';
      req.log.warn({ err }, 'assistant failed');
      if (stream) {
        stream.send({ type: 'error', error: message });
        stream.end();
        return reply;
      }
      if (err instanceof AiError) return reply.code(502).send({ error: message });
      throw err;
    }

    // Both turns are stored only after a successful reply, so a failure leaves no orphan.
    // Timestamps only move forward, so the thread's order is unambiguous.
    const latest = db
      .select({ at: assistantMessages.createdAt })
      .from(assistantMessages)
      .where(eq(assistantMessages.userId, user.id))
      .orderBy(desc(assistantMessages.createdAt))
      .get()?.at;
    const ts = Math.max(now(), (latest ?? 0) + 1);
    const [userMessage, assistantMessage] = db.transaction((tx) => [
      tx.insert(assistantMessages).values({ id: randomUUID(), userId: user.id, role: 'user', content: body.data.content, createdAt: ts }).returning().get(),
      tx.insert(assistantMessages).values({ id: randomUUID(), userId: user.id, role: 'assistant', content: answer, createdAt: ts + 1 }).returning().get(),
    ]);
    const result = { userMessage: dto(userMessage!), assistantMessage: dto(assistantMessage!) };

    if (stream) {
      stream.send({ type: 'done', ...result });
      stream.end();
      return reply;
    }
    return reply.code(201).send(result);
  });
}
