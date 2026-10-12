import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { AiError } from '../claude/client';
import { questions } from '../db/schema';
import { questionDto } from '../dto';
import { sniffImage } from '../images';
import type { AppDeps } from '../app';

export function solveRoutes(app: FastifyInstance, { env, db, ai, now }: AppDeps): void {
  // multipart/form-data with a single "image" file field.
  app.post('/solve', async (req, reply) => {
    const file = await req.file();
    if (!file || file.fieldname !== 'image') {
      return reply.code(400).send({ error: '"image" alanında bir görsel gönderilmeli.' });
    }
    const buf = await file.toBuffer();
    const kind = sniffImage(buf);
    if (!kind) {
      return reply.code(415).send({ error: 'Desteklenmeyen görsel türü. JPEG, PNG veya WEBP gönder.' });
    }

    const id = randomUUID();
    const imageFile = `${id}.${kind.ext}`;
    const imagePath = path.join(env.imagesDir, imageFile);
    await fs.writeFile(imagePath, buf);

    let solution;
    try {
      solution = await ai.solver.solve(buf, kind.mime);
    } catch (err) {
      await fs.rm(imagePath, { force: true });
      if (err instanceof AiError) {
        req.log.warn({ err }, 'solve failed');
        return reply.code(502).send({ error: err.message });
      }
      throw err;
    }

    const row = db
      .insert(questions)
      .values({
        id,
        createdAt: now(),
        imageFile,
        imageMime: kind.mime,
        model: ai.model,
        ...solution,
      })
      .returning()
      .get();

    return reply.code(201).send(questionDto(row));
  });
}
