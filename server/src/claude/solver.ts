import { z } from 'zod';
import { CHOICE_LABELS, choiceFromAnswer, cleanChoices, splitChoices, type Choice, type ChoiceLabel } from '../choices';
import type { ImageMime } from '../images';
import { getTopic, SUBJECTS_BY_EXAM, type Exam, type Subject } from '../topics';
import { AiError, type Claude } from './client';
import { ALL_SUBJECTS, TOPIC_IDS, TOPIC_LIST } from './taxonomy';

export interface Solution {
  exam: Exam;
  subject: Subject;
  topicId: string;
  difficulty: number;
  /** The stem only; the choices are in `choices`. */
  questionText: string;
  /** Null for an open-ended question. */
  choices: Choice[] | null;
  hints: string[];
  solutionSteps: string[];
  finalAnswer: string;
  /** The letter of the correct choice, null if open-ended or no choice matched. */
  correctChoice: ChoiceLabel | null;
  confidence: number;
}

export interface Solver {
  solve(image: Buffer, mime: ImageMime): Promise<Solution>;
  readonly model: string;
}


// Property order matters: the model fills fields in this order, so transcription and
// the worked solution come before hints and the self-assessed confidence.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    questionText: {
      type: 'string',
      description: 'Faithful Turkish transcription of the question stem in markdown + LaTeX, WITHOUT the answer choices.',
    },
    choices: {
      type: 'array',
      description: 'The answer choices exactly as printed, in order. Empty if the question has none.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', enum: [...CHOICE_LABELS] },
          text: { type: 'string', description: 'Choice content in markdown + LaTeX, without the letter.' },
        },
        required: ['label', 'text'],
        additionalProperties: false,
      },
    },
    exam: { type: 'string', enum: ['TYT', 'AYT'] },
    subject: { type: 'string', enum: ALL_SUBJECTS },
    topicId: { type: 'string', enum: TOPIC_IDS },
    difficulty: { type: 'integer', description: 'YKS difficulty from 1 (very easy) to 5 (very hard).' },
    solutionSteps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ordered solution steps in Turkish, markdown + LaTeX.',
    },
    finalAnswer: { type: 'string', description: 'Final answer, e.g. "C) 12".' },
    correctChoice: {
      type: 'string',
      enum: [...CHOICE_LABELS, 'none'],
      description: 'Letter of the correct choice; "none" if the question has no choices.',
    },
    hints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly 3 progressive hints in Turkish that never reveal the final answer.',
    },
    confidence: { type: 'number', description: 'Probability from 0 to 1 that finalAnswer is correct.' },
  },
  required: [
    'questionText',
    'choices',
    'exam',
    'subject',
    'topicId',
    'difficulty',
    'solutionSteps',
    'finalAnswer',
    'correctChoice',
    'hints',
    'confidence',
  ],
  additionalProperties: false,
} as const;

const OutputSchema = z.object({
  questionText: z.string(),
  choices: z.array(z.object({ label: z.string(), text: z.string() })).default([]),
  correctChoice: z.string().default('none'),
  exam: z.enum(['TYT', 'AYT']),
  subject: z.string(),
  topicId: z.string(),
  difficulty: z.number(),
  solutionSteps: z.array(z.string()),
  finalAnswer: z.string(),
  hints: z.array(z.string()),
  confidence: z.number(),
});


const SYSTEM_PROMPT = `You are an expert YKS tutor helping a Turkish high-school student prepare for TYT and AYT (Sayısal). The student sends a photo of one exam-style question. Everything you write for the student must be in Turkish.

Fill the output fields as follows:

- questionText: transcribe the question stem faithfully, WITHOUT the answer choices (they go in choices). If a figure, table or graph matters, describe the relevant parts in one short bracketed note, e.g. "[Şekil: ABC dik üçgen, |AB| = 6]". If the photo shows several questions, take the one that is fully visible and most central. If there is no readable question, say so here and set confidence to 0.
- choices: every answer choice exactly as printed, in order, with its letter in label and its content (markdown + LaTeX, no letter) in text. YKS questions usually have five (A–E), older or other sources four. Leave the list empty only if the question really has no choices.
- exam, subject, topicId: classify the question. topicId must be the single best match from the topic list below; exam and subject must agree with that topic. Decide TYT vs AYT by curriculum level (for example limit, derivative, integral, logarithm, advanced trigonometry, complex numbers → AYT; basic problems, ratios, number theory → TYT).
- difficulty: 1 (very easy) to 5 (very hard), relative to real YKS questions.
- solutionSteps: a clear worked solution, one step per item. Explain why each step is taken, the way a good teacher would at the board, concise but without skipping logic a student would get stuck on. Point out the trap if the question has one.
- finalAnswer: the correct choice letter and its value, e.g. "C) 12". Without choices, just the value.
- correctChoice: the letter of the correct choice, the same one as in finalAnswer; "none" if there are no choices.
- hints: exactly 3 progressive hints. Hint 1 names the idea or where to start. Hint 2 gives the key insight or first concrete step. Hint 3 takes the student almost to the end. No hint may reveal the final answer or its choice letter.
- confidence: your calibrated probability that finalAnswer is correct. Lower it when the photo is blurry or cut off, the figure is hard to read, the question is ambiguous, or you had to assume something.

Formatting for every text field: markdown with LaTeX math, using $...$ inline and $$...$$ for display equations. Do not use \\( \\) or \\[ \\] delimiters and do not use HTML.

Topic list (id — exam · subject · topic):
${TOPIC_LIST}`;

/** The choices and the stem without them; falls back to choices left inside the text. */
function choicesOf(raw: z.infer<typeof OutputSchema>): { stem: string; choices: Choice[] | null } {
  const stem = raw.questionText.trim();
  const choices = cleanChoices(raw.choices);
  if (choices) {
    // The model sometimes repeats the choices in the stem as well.
    const split = splitChoices(stem);
    return { stem: split ? split.stem : stem, choices };
  }
  const split = splitChoices(stem);
  return split ? { stem: split.stem, choices: split.choices } : { stem, choices: null };
}

function normalize(raw: z.infer<typeof OutputSchema>): Solution {
  // The topic is authoritative: it pins exam and subject. Fall back to the model's
  // own exam/subject only if the id is somehow unknown.
  const topic = getTopic(raw.topicId);
  const exam = topic?.exam ?? raw.exam;
  const subject = topic?.subject ?? (ALL_SUBJECTS.includes(raw.subject as Subject) ? (raw.subject as Subject) : SUBJECTS_BY_EXAM[exam][0]!);
  const { stem, choices } = choicesOf(raw);
  const finalAnswer = raw.finalAnswer.trim();
  // The explicit letter wins; the one at the start of finalAnswer backs it up.
  const letter = [raw.correctChoice.trim().toUpperCase(), choiceFromAnswer(finalAnswer)].find(
    (l): l is ChoiceLabel => !!l && !!choices?.some((c) => c.label === l),
  );
  return {
    exam,
    subject,
    topicId: topic?.id ?? raw.topicId,
    difficulty: Math.min(5, Math.max(1, Math.round(raw.difficulty))),
    questionText: stem,
    choices,
    hints: raw.hints.map((h) => h.trim()).filter(Boolean).slice(0, 3),
    solutionSteps: raw.solutionSteps.map((s) => s.trim()).filter(Boolean),
    finalAnswer,
    correctChoice: letter ?? null,
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
        questionText: '$x^2 - 5x + 6 = 0$ denkleminin kökleri $a$ ve $b$ olduğuna göre, $a^2 + b^2$ kaçtır?',
        choices: [
          { label: 'A', text: '11' },
          { label: 'B', text: '12' },
          { label: 'C', text: '13' },
          { label: 'D', text: '14' },
          { label: 'E', text: '15' },
        ],
        correctChoice: 'C',
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
