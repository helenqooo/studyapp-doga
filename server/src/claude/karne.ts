import { z } from 'zod';
import type { ExamSectionResult } from '../db/schema';
import { mergeTopics } from '../exams';
import type { ImageMime } from '../images';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, type Exam, type Subject } from '../topics';
import { AiError, type Claude } from './client';
import { ALL_SUBJECTS, TOPIC_IDS, TOPIC_LIST } from './taxonomy';

/** What the form is pre-filled with after reading a karne photo. Nothing is saved yet. */
export interface KarneDraft {
  exam: Exam;
  name: string | null;
  date: string | null;
  sections: ExamSectionResult[];
  confidence: number;
  /** Turkish notes for the student: the model's own remarks plus consistency warnings. */
  warnings: string[];
}

export interface KarneParser {
  parse(image: Buffer, mime: ImageMime): Promise<KarneDraft>;
}

const COUNT = { type: 'integer' } as const;
const NULLABLE_STRING = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    exam: { type: 'string', enum: ['TYT', 'AYT'] },
    name: { ...NULLABLE_STRING, description: 'Deneme / publisher name if printed, else null.' },
    date: { ...NULLABLE_STRING, description: 'Exam date as YYYY-MM-DD if printed, else null.' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string', enum: ALL_SUBJECTS },
          correct: COUNT,
          wrong: COUNT,
          blank: COUNT,
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { topicId: { type: 'string', enum: TOPIC_IDS }, correct: COUNT, wrong: COUNT, blank: COUNT },
              required: ['topicId', 'correct', 'wrong', 'blank'],
              additionalProperties: false,
            },
          },
        },
        required: ['subject', 'correct', 'wrong', 'blank', 'topics'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string', description: 'Short Turkish note about anything unreadable or uncertain; empty if none.' },
    confidence: { type: 'number', description: 'Probability from 0 to 1 that every extracted count is right.' },
  },
  required: ['exam', 'name', 'date', 'sections', 'notes', 'confidence'],
  additionalProperties: false,
} as const;

const Count = z.number().transform((n) => Math.max(0, Math.round(n)));
const OutputSchema = z.object({
  exam: z.enum(['TYT', 'AYT']),
  name: z.string().nullable(),
  date: z.string().nullable(),
  sections: z.array(
    z.object({
      subject: z.string(),
      correct: Count,
      wrong: Count,
      blank: Count,
      topics: z.array(z.object({ topicId: z.string(), correct: Count, wrong: Count, blank: Count })),
    }),
  ),
  notes: z.string(),
  confidence: z.number(),
});

const SYSTEM_PROMPT = `You read Turkish YKS practice exam result sheets ("deneme karnesi"): photos or screenshots of printed or online results. Extract the student's own correct (D / doğru), wrong (Y / yanlış) and blank (B / boş) counts.

Sections and question counts:
- TYT: Türkçe (40), Sosyal (20 = Tarih + Coğrafya + Felsefe + Din Kültürü, add the parts up), Temel Matematik (40, geometry included), Fen (20 = Fizik + Kimya + Biyoloji, add the parts up).
- AYT Sayısal: Matematik (40, geometry included), Fizik (14), Kimya (13), Biyoloji (13). Ignore AYT sections outside Sayısal (Edebiyat, Tarih, Coğrafya, Felsefe grubu…).

Rules:
- Use the student's counts, not class or national averages, and not nets.
- If only D and Y are printed, blank = section question count − D − Y.
- If the sheet has a topic analysis (per-topic D/Y/B, or a per-question table with topic names and the student's answer), map each topic to the closest topicId from the list below and add up counts per topicId. A wrong mark (often ✗ or a different letter) counts as wrong; an empty answer as blank. Leave topics empty when the sheet has no topic breakdown.
- If the sheet covers both TYT and AYT, extract the one with more readable data and say so in notes.
- Never invent numbers. If something is unreadable, use 0, lower confidence and explain it in notes (in Turkish).

Topic list (id — exam · subject · topic):
${TOPIC_LIST}`;

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Fits the model output to the exam's sections and flags anything that doesn't add up. */
export function normalizeKarne(raw: z.infer<typeof OutputSchema>): KarneDraft {
  const exam = raw.exam;
  const warnings: string[] = raw.notes.trim() ? [raw.notes.trim()] : [];

  const sections: ExamSectionResult[] = SUBJECTS_BY_EXAM[exam].map((subject: Subject) => {
    const found = raw.sections.filter((s) => s.subject === subject);
    const total = QUESTION_COUNTS[subject];
    if (!found.length) {
      warnings.push(`${subject} karnede bulunamadı, elle kontrol et.`);
      return { subject, correct: 0, wrong: 0, blank: total, topics: [] };
    }
    const s = found.reduce((a, b) => ({ ...a, correct: a.correct + b.correct, wrong: a.wrong + b.wrong, blank: a.blank + b.blank, topics: [...a.topics, ...b.topics] }));
    if (s.correct + s.wrong > total) {
      warnings.push(`${subject}: doğru + yanlış toplamı ${total} soruyu geçiyor, değerleri kontrol et.`);
    } else if (s.correct + s.wrong + s.blank !== total) {
      warnings.push(`${subject}: boş sayısı soru sayısıyla tutmadı, ${total - s.correct - s.wrong} olarak düzeltildi.`);
    }
    const topics = mergeTopics(
      s.topics.filter((t) => {
        const topic = getTopic(t.topicId);
        return topic?.exam === exam && topic.subject === subject;
      }),
    );
    return { subject, correct: s.correct, wrong: s.wrong, blank: Math.max(0, total - s.correct - s.wrong), topics };
  });

  return {
    exam,
    name: raw.name?.trim() || null,
    date: isDate(raw.date) ? raw.date : null,
    sections,
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    warnings,
  };
}

export function createClaudeKarneParser(claude: Claude): KarneParser {
  return {
    async parse(image, mime) {
      const text = await claude.run({
        maxTokens: 32000,
        outputFormat: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        refusalMessage: 'Bu karne okunamadı. Farklı bir fotoğraf dene.',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: image.toString('base64') } },
              { type: 'text', text: 'Bu deneme karnesini oku.' },
            ],
          },
        ],
      });
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new AiError('Claude geçersiz bir yanıt döndürdü. Tekrar dene.');
      }
      const parsed = OutputSchema.safeParse(json);
      if (!parsed.success) throw new AiError('Claude beklenmeyen bir yanıt döndürdü. Tekrar dene.');
      return normalizeKarne(parsed.data);
    },
  };
}

/** Canned karne for UI testing without API cost (MOCK_SOLVER=true). */
export function createMockKarneParser({ delayMs = 1200 } = {}): KarneParser {
  return {
    async parse() {
      await new Promise((r) => setTimeout(r, delayMs));
      return normalizeKarne({
        exam: 'TYT',
        name: 'Örnek Yayınları TYT-4',
        date: null,
        sections: [
          { subject: 'Türkçe', correct: 31, wrong: 6, blank: 3, topics: [{ topicId: 'tyt-tr-paragraf-ana-dusunce', correct: 8, wrong: 3, blank: 1 }] },
          { subject: 'Sosyal', correct: 13, wrong: 4, blank: 3, topics: [] },
          {
            subject: 'Temel Matematik',
            correct: 24,
            wrong: 7,
            blank: 9,
            topics: [
              { topicId: 'tyt-mat-problem-yas', correct: 1, wrong: 2, blank: 1 },
              { topicId: 'tyt-geo-cember-daire', correct: 0, wrong: 1, blank: 2 },
            ],
          },
          { subject: 'Fen', correct: 11, wrong: 5, blank: 4, topics: [] },
        ],
        notes: '',
        confidence: 0.9,
      });
    },
  };
}
