import { randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { AiError } from '../claude/client';
import { exams, profile } from '../db/schema';
import { profileDto } from '../dto';
import { examDto, mergeTopics, orderSections, validateSections } from '../exams';
import { XP } from '../gamification';
import { sniffImage } from '../images';
import type { IdParams } from './questions';

const Count = z.number().int().min(0).max(100);

const ExamBody = z.object({
  exam: z.enum(['TYT', 'AYT']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().max(120).nullish(),
  sections: z
    .array(
      z.object({
        subject: z.string(),
        correct: Count,
        wrong: Count,
        blank: Count,
        topics: z
          .array(z.object({ topicId: z.string(), correct: Count, wrong: Count, blank: Count }))
          .max(150)
          .default([]),
      }),
    )
    .min(1)
    .max(4),
});

const ListQuery = z.object({ exam: z.enum(['TYT', 'AYT']).optional() });

/** Parses and validates an exam body; returns the row values or a Turkish error. */
function readBody(raw: unknown): { ok: true; value: Omit<typeof exams.$inferInsert, 'id' | 'createdAt'> } | { ok: false; error: string } {
  const body = ExamBody.safeParse(raw);
  if (!body.success) return { ok: false, error: 'Deneme bilgileri eksik ya da hatalı.' };
  const { exam, date, name } = body.data;
  const sections = orderSections(
    exam,
    body.data.sections.map((s) => ({ ...s, topics: mergeTopics(s.topics) })),
  );
  const error = validateSections(exam, sections);
  if (error) return { ok: false, error };
  return { ok: true, value: { exam, date, name: name || null, sections } };
}

export function examRoutes(app: FastifyInstance, { db, ai, now }: AppDeps): void {
  // Reads a karne photo into an editable draft. Nothing is stored.
  app.post('/exams/parse', async (req, reply) => {
    const file = await req.file();
    if (!file || file.fieldname !== 'image') {
      return reply.code(400).send({ error: '"image" alanında bir görsel gönderilmeli.' });
    }
    const buf = await file.toBuffer();
    const kind = sniffImage(buf);
    if (!kind) return reply.code(415).send({ error: 'Desteklenmeyen görsel türü. JPEG, PNG veya WEBP gönder.' });
    try {
      return await ai.karne.parse(buf, kind.mime);
    } catch (err) {
      if (err instanceof AiError) {
        req.log.warn({ err }, 'karne parse failed');
        return reply.code(502).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post('/exams', async (req, reply) => {
    const body = readBody(req.body);
    if (!body.ok) return reply.code(400).send({ error: body.error });

    const { row, updatedProfile } = db.transaction((tx) => ({
      row: tx
        .insert(exams)
        .values({ id: randomUUID(), createdAt: now(), ...body.value })
        .returning()
        .get(),
      updatedProfile: tx
        .update(profile)
        .set({ xp: sql`${profile.xp} + ${XP.examEntry}` })
        .where(eq(profile.id, 1))
        .returning()
        .get(),
    }));

    return reply.code(201).send({ exam: examDto(row), xpGained: XP.examEntry, profile: profileDto(updatedProfile) });
  });

  app.get('/exams', async (req, reply) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'Geçersiz filtre.' });
    const rows = db
      .select()
      .from(exams)
      .where(query.data.exam ? eq(exams.exam, query.data.exam) : undefined)
      .orderBy(desc(exams.date), desc(exams.createdAt))
      .all();
    return { items: rows.map(examDto) };
  });

  app.get<IdParams>('/exams/:id', async (req, reply) => {
    const row = db.select().from(exams).where(eq(exams.id, req.params.id)).get();
    if (!row) return reply.code(404).send({ error: 'Deneme bulunamadı.' });
    return examDto(row);
  });

  app.put<IdParams>('/exams/:id', async (req, reply) => {
    const body = readBody(req.body);
    if (!body.ok) return reply.code(400).send({ error: body.error });
    const row = db.update(exams).set(body.value).where(eq(exams.id, req.params.id)).returning().get();
    if (!row) return reply.code(404).send({ error: 'Deneme bulunamadı.' });
    return examDto(row);
  });

  app.delete<IdParams>('/exams/:id', async (req, reply) => {
    const row = db.delete(exams).where(eq(exams.id, req.params.id)).returning({ id: exams.id }).get();
    if (!row) return reply.code(404).send({ error: 'Deneme bulunamadı.' });
    return reply.code(204).send();
  });
}
