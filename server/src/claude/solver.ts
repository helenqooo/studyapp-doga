import { z } from 'zod';
import type { ImageMime } from '../images';
import { getTopic, SUBJECTS_BY_EXAM, TOPICS, topicLabel, type Exam, type Subject } from '../topics';
import { AiError, type Claude } from './client';

export interface Solution {
  exam: Exam;
  subject: Subject;
  topicId: string;
  difficulty: number;
  questionText: string;
  hints: string[];
  solutionSteps: string[];
  finalAnswer: string;
  confidence: number;
}

export interface Solver {
  solve(image: Buffer, mime: ImageMime): Promise<Solution>;
  readonly model: string;
}

const ALL_SUBJECTS = [...SUBJECTS_BY_EXAM.TYT, ...SUBJECTS_BY_EXAM.AYT];

// Property order matters: the model fills fields in this order, so transcription and
// the worked solution come before hints and the self-assessed confidence.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    questionText: {
      type: 'string',
      description: 'Faithful Turkish transcription of the question in markdown + LaTeX, including the answer choices.',
    },
    exam: { type: 'string', enum: ['TYT', 'AYT'] },
    subject: { type: 'string', enum: ALL_SUBJECTS },
    topicId: { type: 'string', enum: TOPICS.map((t) => t.id) },
    difficulty: { type: 'integer', description: 'YKS difficulty from 1 (very easy) to 5 (very hard).' },
    solutionSteps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ordered solution steps in Turkish, markdown + LaTeX.',
    },
    finalAnswer: { type: 'string', description: 'Final answer, e.g. "C) 12".' },
    hints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly 3 progressive hints in Turkish that never reveal the final answer.',
    },
    confidence: { type: 'number', description: 'Probability from 0 to 1 that finalAnswer is correct.' },
  },
  required: [
    'questionText',
    'exam',
    'subject',
    'topicId',
    'difficulty',
    'solutionSteps',
    'finalAnswer',
    'hints',
    'confidence',
  ],
  additionalProperties: false,
} as const;

const OutputSchema = z.object({
  questionText: z.string(),
  exam: z.enum(['TYT', 'AYT']),
  subject: z.string(),
  topicId: z.string(),
  difficulty: z.number(),
  solutionSteps: z.array(z.string()),
  finalAnswer: z.string(),
  hints: z.array(z.string()),
  confidence: z.number(),
});

const TOPIC_LIST = TOPICS.map((t) => `${t.id} — ${t.exam} · ${t.subject} · ${topicLabel(t)}`).join('\n');

const SYSTEM_PROMPT = `You are an expert YKS tutor helping a Turkish high-school student prepare for TYT and AYT (Sayısal). The student sends a photo of one exam-style question. Everything you write for the student must be in Turkish.

Fill the output fields as follows:

- questionText: transcribe the question faithfully, including every answer choice on its own line ("A) ...", "B) ..."). If a figure, table or graph matters, describe the relevant parts in one short bracketed note, e.g. "[Şekil: ABC dik üçgen, |AB| = 6]". If the photo shows several questions, take the one that is fully visible and most central. If there is no readable question, say so here and set confidence to 0.
- exam, subject, topicId: classify the question. topicId must be the single best match from the topic list below; exam and subject must agree with that topic. Decide TYT vs AYT by curriculum level (for example limit, derivative, integral, logarithm, advanced trigonometry, complex numbers → AYT; basic problems, ratios, number theory → TYT).
- difficulty: 1 (very easy) to 5 (very hard), relative to real YKS questions.
- solutionSteps: a clear worked solution, one step per item. Explain why each step is taken, the way a good teacher would at the board, concise but without skipping logic a student would get stuck on. Point out the trap if the question has one.
- finalAnswer: the correct choice letter and its value, e.g. "C) 12". Without choices, just the value.
- hints: exactly 3 progressive hints. Hint 1 names the idea or where to start. Hint 2 gives the key insight or first concrete step. Hint 3 takes the student almost to the end. No hint may reveal the final answer or its choice letter.
- confidence: your calibrated probability that finalAnswer is correct. Lower it when the photo is blurry or cut off, the figure is hard to read, the question is ambiguous, or you had to assume something.

Formatting for every text field: markdown with LaTeX math, using $...$ inline and $$...$$ for display equations. Do not use \\( \\) or \\[ \\] delimiters and do not use HTML.

Topic list (id — exam · subject · topic):
${TOPIC_LIST}`;

function normalize(raw: z.infer<typeof OutputSchema>): Solution {
  // The topic is authoritative: it pins exam and subject. Fall back to the model's
  // own exam/subject only if the id is somehow unknown.
  const topic = getTopic(raw.topicId);
  const exam = topic?.exam ?? raw.exam;
  const subject = topic?.subject ?? (ALL_SUBJECTS.includes(raw.subject as Subject) ? (raw.subject as Subject) : SUBJECTS_BY_EXAM[exam][0]!);
  return {
    exam,
    subject,
    topicId: topic?.id ?? raw.topicId,
    difficulty: Math.min(5, Math.max(1, Math.round(raw.difficulty))),
    questionText: raw.questionText.trim(),
    hints: raw.hints.map((h) => h.trim()).filter(Boolean).slice(0, 3),
    solutionSteps: raw.solutionSteps.map((s) => s.trim()).filter(Boolean),
    finalAnswer: raw.finalAnswer.trim(),
    confidence: Math.min(1, Math.max(0, raw.confidence)),
  };
}

export function createClaudeSolver(claude: Claude): Solver {
  return {
    model: claude.model,
    async solve(image, mime) {
      const text = await claude.run({
        maxTokens: 32000,
        outputFormat: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        refusalMessage: 'Bu görsel için çözüm üretilemedi. Farklı bir fotoğraf dene.',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: image.toString('base64') } },
              { type: 'text', text: 'Bu soruyu çöz.' },
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
      if (!parsed.success) {
        throw new AiError('Claude beklenmeyen bir yanıt döndürdü. Tekrar dene.');
      }
      return normalize(parsed.data);
    },
  };
}

/** Canned solution for UI testing without API cost (MOCK_SOLVER=true). */
export function createMockSolver({ delayMs = 1500 } = {}): Solver {
  return {
    model: 'mock',
    async solve() {
      await new Promise((r) => setTimeout(r, delayMs));
      return {
        exam: 'TYT',
        subject: 'Temel Matematik',
        topicId: 'tyt-mat-ikinci-derece',
        difficulty: 2,
        questionText:
          '$x^2 - 5x + 6 = 0$ denkleminin kökleri $a$ ve $b$ olduğuna göre, $a^2 + b^2$ kaçtır?\n\nA) 11\nB) 12\nC) 13\nD) 14\nE) 15',
        hints: [
          'Kökleri tek tek bulmak yerine **kökler toplamı** ve **kökler çarpımı** ile çalışabilirsin.',
          '$a + b = 5$ ve $ab = 6$. $a^2 + b^2$ ifadesini $(a+b)^2$ cinsinden yaz.',
          '$(a+b)^2 = a^2 + 2ab + b^2$ olduğundan $a^2 + b^2 = (a+b)^2 - 2ab$.',
        ],
        solutionSteps: [
          'Vieta bağıntılarından: $a + b = -\\dfrac{-5}{1} = 5$ ve $ab = \\dfrac{6}{1} = 6$.',
          'Özdeşlik: $$a^2 + b^2 = (a+b)^2 - 2ab$$',
          'Yerine koy: $a^2 + b^2 = 5^2 - 2 \\cdot 6 = 25 - 12 = 13$.',
        ],
        finalAnswer: 'C) 13',
        confidence: 0.97,
      };
    },
  };
}
