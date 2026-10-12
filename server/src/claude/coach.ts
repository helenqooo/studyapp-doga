import { z } from 'zod';
import type { Overview } from '../stats';
import { getTopic, topicLabel } from '../topics';
import { AiError, type Claude } from './client';
import { TOPIC_IDS, TOPIC_LIST } from './taxonomy';

export interface WeeklySummaryContent {
  summary: string;
  priorities: { topicId: string; reason: string }[];
}

export interface Coach {
  weeklySummary(overview: Overview): Promise<WeeklySummaryContent>;
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two or three Turkish sentences on how the recent weeks went.' },
    priorities: {
      type: 'array',
      description: 'Exactly 3 topics to prioritize this week, most important first.',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'string', enum: TOPIC_IDS },
          reason: { type: 'string', description: 'One or two Turkish sentences citing the evidence.' },
        },
        required: ['topicId', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'priorities'],
  additionalProperties: false,
} as const;

const OutputSchema = z.object({
  summary: z.string(),
  priorities: z.array(z.object({ topicId: z.string(), reason: z.string() })),
});

const SYSTEM_PROMPT = `You are a YKS (TYT + AYT Sayısal) study coach for one Turkish high-school student. Once a week you look at their data and pick the 3 topics they should prioritize this week.

How to choose:
- Ground every pick in the data: nets lost in exam topic analyses, wrong/blank practice answers, and falling subject nets. Nets lost = 1.25 per wrong + 1 per blank; practice misses are already weighted at half.
- Prefer topics where improvement is likely to win the most nets soon (frequent, high-count sections and topics the student keeps missing) over one-off mistakes.
- If topic-level data is thin, use subject trends to pick a sensible foundational topic in the weakest subject, and say that the evidence is limited.
- Don't pick the same topic twice.

Write in Turkish, warm but concrete. Reasons: one or two sentences each, mention the numbers that justify the pick and a concrete action (e.g. "her gün 15 soru"). Summary: two or three sentences about the overall trend. Plain text, no markdown or LaTeX.

Topic list (id — exam · subject · topic):
${TOPIC_LIST}`;

/** Compact, labeled view of the overview so the model sees names, not just ids. */
function describe(o: Overview) {
  const exam = (key: 'TYT' | 'AYT') => {
    const e = o.byExam[key];
    return {
      examsEntered: e.count,
      maxNet: e.maxNet,
      lastExams: e.trend.slice(-8).map((t) => ({ date: t.date, name: t.name, totalNet: t.totalNet, sectionNets: t.sections })),
      subjects: e.subjects,
    };
  };
  return {
    today: o.today,
    TYT: exam('TYT'),
    AYT: exam('AYT'),
    topicLossesLast90Days: o.topicLosses.map((t) => {
      const topic = getTopic(t.topicId);
      return { ...t, label: topic ? `${topic.exam} ${topic.subject} · ${topicLabel(topic)}` : t.topicId };
    }),
    practiceLast90Days: o.practice,
  };
}

function normalize(raw: z.infer<typeof OutputSchema>): WeeklySummaryContent {
  const priorities: WeeklySummaryContent['priorities'] = [];
  for (const p of raw.priorities) {
    if (!getTopic(p.topicId) || priorities.some((x) => x.topicId === p.topicId)) continue;
    priorities.push({ topicId: p.topicId, reason: p.reason.trim() });
  }
  return { summary: raw.summary.trim(), priorities: priorities.slice(0, 3) };
}

export function createClaudeCoach(claude: Claude): Coach {
  return {
    async weeklySummary(overview) {
      const text = await claude.run({
        maxTokens: 16000,
        outputFormat: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        refusalMessage: 'Haftalık özet oluşturulamadı. Daha sonra tekrar dene.',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Öğrencinin verileri (JSON):\n${JSON.stringify(describe(overview))}` }],
      });
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new AiError('Claude geçersiz bir yanıt döndürdü. Tekrar dene.');
      }
      const parsed = OutputSchema.safeParse(json);
      if (!parsed.success) throw new AiError('Claude beklenmeyen bir yanıt döndürdü. Tekrar dene.');
      return normalize(parsed.data);
    },
  };
}

/** Canned summary for UI testing without API cost (MOCK_SOLVER=true). */
export function createMockCoach({ delayMs = 1200 } = {}): Coach {
  return {
    async weeklySummary(overview) {
      await new Promise((r) => setTimeout(r, delayMs));
      const fromData = overview.topicLosses.slice(0, 3).map((t) => ({
        topicId: t.topicId,
        reason: `Son 90 günde bu konuda ${t.lostNet.toString().replace('.', ',')} net kaybettin. Bu hafta her gün 10 soru çöz.`,
      }));
      const fallback = ['tyt-mat-problem-yas', 'tyt-tr-paragraf-ana-dusunce', 'tyt-geo-ucgende-alan']
        .filter((id) => !fromData.some((p) => p.topicId === id))
        .map((topicId) => ({ topicId, reason: 'Temel bir konu; düzenli tekrar netlerine hızlı yansır.' }));
      return {
        summary: 'Bu bir örnek özet. Netlerin genel olarak yükselişte, kaybın en çok birkaç konuda toplanıyor.',
        priorities: [...fromData, ...fallback].slice(0, 3),
      };
    },
  };
}
