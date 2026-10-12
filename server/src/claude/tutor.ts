import type Anthropic from '@anthropic-ai/sdk';
import { resolveChoices } from '../choices';
import type { questions } from '../db/schema';
import type { ImageMime } from '../images';
import { getTopic, topicLabel } from '../topics';
import type { Claude } from './client';

type QuestionRow = typeof questions.$inferSelect;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Tutor {
  /** `history` is the earlier conversation; `message` is the student's new question. */
  reply(input: { question: QuestionRow; image: Buffer; history: ChatTurn[]; message: string }): Promise<string>;
}

const SYSTEM_PROMPT = `You are a patient, encouraging YKS tutor. A Turkish high-school student is working on the question in the attached photo. You already produced the stored solution shown below; the student may have read some hints or the full solution, and now says they did not understand something.

Reply in Turkish. Focus on exactly what the student is asking: explain the step, idea or formula they are stuck on, the way a good teacher would one-on-one. Keep it short (a few short paragraphs or steps) unless they ask for more detail. Don't volunteer the final answer if they have only asked about an early step. If they ask for a similar practice question, write one in the same style without its solution. If you notice the stored solution contains a mistake, say so plainly and give the correct reasoning. If the message is unrelated to this question or YKS studying, answer briefly and steer back.

Formatting: markdown with LaTeX math, using $...$ inline and $$...$$ for display equations. Do not use \\( \\) or \\[ \\] delimiters and do not use HTML.`;

function questionContext(q: QuestionRow): string {
  const topic = getTopic(q.topicId);
  const steps = q.solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const hints = q.hints.map((h, i) => `${i + 1}. ${h}`).join('\n');
  const mc = resolveChoices(q);
  const choices = mc.choices ? mc.choices.map((c) => `${c.label}) ${c.text}`).join('\n') : '';
  return [
    `Topic: ${q.exam} · ${q.subject}${topic ? ` · ${topicLabel(topic)}` : ''}`,
    `Question (transcribed):\n${mc.stem}`,
    ...(choices ? [`Choices:\n${choices}`] : []),
    `Hints shown to the student on request:\n${hints}`,
    `Stored solution:\n${steps}`,
    `Final answer: ${q.finalAnswer}`,
    ...(mc.answerKey && mc.answerKey !== mc.aiChoice
      ? [`The student's answer key says ${mc.answerKey}, not ${mc.aiChoice ?? 'the stored answer'}. Trust the answer key and look for the mistake in the stored solution.`]
      : []),
  ].join('\n\n');
}

export function createClaudeTutor(claude: Claude): Tutor {
  return {
    async reply({ question, image, history, message }) {
      const turns: ChatTurn[] = [...history, { role: 'user', content: message }];
      const last = turns.length - 1;

      // The image and question context lead the first user turn and never change, so they
      // sit in the cached prefix; the history is append-only.
      const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((turn, i) => {
        const text: Anthropic.Beta.BetaTextBlockParam = {
          type: 'text',
          text: turn.content,
          // Cache the whole conversation so the next follow-up only pays for new turns.
          ...(i === last ? { cache_control: { type: 'ephemeral' as const } } : {}),
        };
        if (i !== 0) return { role: turn.role, content: [text] };
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: question.imageMime as ImageMime, data: image.toString('base64') },
            },
            { type: 'text', text: questionContext(question), cache_control: { type: 'ephemeral' } },
            text,
          ],
        };
      });

      const reply = await claude.run({
        maxTokens: 16000,
        refusalMessage: 'Bu soruya yanıt verilemedi. Farklı şekilde sormayı dene.',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages,
      });
      return reply.trim();
    },
  };
}

/** Canned tutor for UI testing without API cost (MOCK_SOLVER=true). */
export function createMockTutor({ delayMs = 800 } = {}): Tutor {
  return {
    async reply({ message }) {
      await new Promise((r) => setTimeout(r, delayMs));
      return `Güzel soru! "${message}" diye sormuşsun.\n\nŞöyle düşün: $a^2 + b^2$ ifadesini doğrudan bulmak zor, ama $(a+b)^2 = a^2 + 2ab + b^2$ özdeşliğinden\n\n$$a^2 + b^2 = (a+b)^2 - 2ab$$\n\nyazabiliriz. Böylece sadece $a+b$ ve $ab$ değerlerine ihtiyacımız kalır.`;
    },
  };
}
