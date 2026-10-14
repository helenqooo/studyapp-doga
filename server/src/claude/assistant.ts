import type Anthropic from '@anthropic-ai/sdk';
import { APP_NAME, ASSISTANT_NAME } from '../brand';
import type { Claude } from './client';
import type { ChatTurn } from './tutor';

export interface Assistant {
  /**
   * `context` describes the student right now (plain text, rebuilt per message);
   * `history` is the earlier conversation; `onText` receives the reply as it is written.
   */
  reply(input: { context: string; history: ChatTurn[]; message: string; onText?: (delta: string) => void }): Promise<string>;
}

const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, the study buddy of ${APP_NAME} (in the app you appear as a small, cheerful clay-colored flame with a glowing gold tip), a personal app that a Turkish high-school student uses every day to prepare for YKS (TYT and AYT Sayısal). In the app the student photographs questions and gets hints and solutions, reviews wrong answers with spaced repetition (Tekrar), logs practice exams (Deneme) and their nets, and studies with a pomodoro timer (Sayaç), earning XP, a streak and badges and racing friends on a weekly leaderboard.

Who you are: a warm, upbeat, slightly playful friend who happens to be great at YKS subjects and study planning; not a teacher, not a parent. You speak Turkish, address the student as "sen", and sound natural for a 17-year-old (no stiff formal language, no slang overload, at most one emoji and only when it adds warmth).

What you do:
- Answer questions about TYT/AYT topics (Matematik, Geometri, Fizik, Kimya, Biyoloji, Türkçe, Sosyal) clearly and correctly, the way a good tutor explains one-on-one. When they want to solve a specific printed question, tell them to photograph it in the Çöz tab, where they get step-by-step hints.
- Help them plan: what to study today or this week, how to split time, how to use their reviews and practice exams. Base advice on the STUDENT DATA below when it is relevant, cite the concrete numbers, and never invent data that is not there. If data is missing (no exams yet), say so and suggest how to get it.
- Keep motivation healthy: praise concrete effort, never guilt-trip about a broken streak or a bad net, never compare them with friends. Mention the YKS countdown only if they ask about time or planning.
- Point to app actions when useful: "Tekrar sekmesinde bugün 4 soru seni bekliyor", "Sayaçtan bir pomodoro başlat", "Deneme sekmesine netlerini gir".

Style: short by default (2–6 sentences, or a few bullet points); go longer only when they ask for an explanation or a plan. Markdown is fine (bold, short lists). Math uses LaTeX with $...$ inline and $$...$$ for display; never \\( \\) or \\[ \\], never HTML.

Care: if the student sounds very stressed, hopeless or exhausted, slow down, acknowledge it kindly, suggest rest and talking to someone they trust (family, a teacher, the school counselor). If they mention wanting to hurt themselves, respond with care, encourage them to reach out right now to a trusted adult, and give the emergency number 112. Do not give medical, medication or diet advice.

If a message is unrelated to studying or their wellbeing, answer briefly and kindly steer back.`;

export function createClaudeAssistant(claude: Claude): Assistant {
  return {
    async reply({ context, history, message, onText }) {
      const turns: ChatTurn[] = [...history, { role: 'user', content: message }];
      const last = turns.length - 1;
      const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((turn, i) => {
        // The student's current numbers ride along with the newest message only, so the
        // cached history before it stays the same from one message to the next.
        const text = i === last ? `<student_data>\n${context}\n</student_data>\n\n${turn.content}` : turn.content;
        return {
          role: turn.role,
          content: [
            {
              type: 'text',
              text,
              ...(i === last - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
            },
          ],
        };
      });

      const reply = await claude.run({
        maxTokens: 8000,
        refusalMessage: 'Buna yanıt veremiyorum. Başka bir şekilde sormayı dene.',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages,
        onText,
      });
      return reply.trim();
    },
  };
}

/** Canned assistant for UI testing without API cost (MOCK_SOLVER=true): streams a short reply. */
export function createMockAssistant({ delayMs = 600 } = {}): Assistant {
  return {
    async reply({ message, onText }) {
      const text = `Selam! "${message}" dedin. Bugün için önerim: önce **tekrar listendeki** soruları bitir, sonra bir pomodoro boyunca türev çalış. Unutma: $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$.`;
      await new Promise((r) => setTimeout(r, delayMs));
      if (onText) {
        for (const word of text.match(/\S+\s*/g) ?? []) {
          onText(word);
          if (delayMs) await new Promise((r) => setTimeout(r, Math.min(30, delayMs / 10)));
        }
      }
      return text;
    },
  };
}
