import type { exams, ExamSectionResult, ExamTopicResult } from './db/schema';
import { getTopic, QUESTION_COUNTS, SUBJECTS_BY_EXAM, type Exam, type Subject } from './topics';

type ExamRow = typeof exams.$inferSelect;

/** YKS net: each wrong answer cancels a quarter of a correct one. */
export function net(correct: number, wrong: number): number {
  return correct - wrong / 4;
}

/** Nets a wrong answer costs vs. getting it right (the point plus the penalty); a blank costs 1. */
export function lostNet(wrong: number, blank: number): number {
  return wrong * 1.25 + blank;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ExamInput {
  exam: Exam;
  date: string;
  name?: string | null;
  sections: ExamSectionResult[];
}

/**
 * Validates a section list for an exam. Returns a Turkish error message, or null if valid.
 * Sections may be a subset (a section not taken can be left out).
 */
export function validateSections(exam: Exam, sections: ExamSectionResult[]): string | null {
  if (!sections.length) return 'En az bir ders girilmeli.';
  const allowed = SUBJECTS_BY_EXAM[exam];
  const seen = new Set<string>();
  for (const s of sections) {
    if (!allowed.includes(s.subject as Subject)) return `${s.subject} bir ${exam} dersi değil.`;
    if (seen.has(s.subject)) return `${s.subject} iki kez girilmiş.`;
    seen.add(s.subject);
    const total = QUESTION_COUNTS[s.subject as Subject];
    if (s.correct + s.wrong + s.blank > total) return `${s.subject}: doğru + yanlış + boş toplamı ${total} soruyu geçemez.`;
    for (const t of s.topics ?? []) {
      const topic = getTopic(t.topicId);
      if (!topic || topic.exam !== exam || topic.subject !== s.subject) {
        return `${s.subject} için geçersiz konu: ${t.topicId}.`;
      }
    }
  }
  return null;
}

/** Merges duplicate topic rows and drops empty ones. */
export function mergeTopics(topics: ExamTopicResult[]): ExamTopicResult[] {
  const byId = new Map<string, ExamTopicResult>();
  for (const t of topics) {
    const prev = byId.get(t.topicId);
    if (prev) {
      prev.correct += t.correct;
      prev.wrong += t.wrong;
      prev.blank += t.blank;
    } else {
      byId.set(t.topicId, { ...t });
    }
  }
  return [...byId.values()].filter((t) => t.correct + t.wrong + t.blank > 0);
}

/** Sorts sections into the exam's subject order. */
export function orderSections(exam: Exam, sections: ExamSectionResult[]): ExamSectionResult[] {
  const order = SUBJECTS_BY_EXAM[exam];
  return [...sections].sort((a, b) => order.indexOf(a.subject as Subject) - order.indexOf(b.subject as Subject));
}

export function examDto(e: ExamRow) {
  const sections = e.sections.map((s) => ({
    subject: s.subject,
    questions: QUESTION_COUNTS[s.subject as Subject] ?? s.correct + s.wrong + s.blank,
    correct: s.correct,
    wrong: s.wrong,
    blank: s.blank,
    net: round2(net(s.correct, s.wrong)),
    topics: (s.topics ?? []).map((t) => ({ ...t, net: round2(net(t.correct, t.wrong)) })),
  }));
  return {
    id: e.id,
    createdAt: new Date(e.createdAt).toISOString(),
    date: e.date,
    exam: e.exam,
    name: e.name,
    sections,
    totalNet: round2(sections.reduce((sum, s) => sum + s.net, 0)),
    totalQuestions: sections.reduce((sum, s) => sum + s.questions, 0),
  };
}

export type ExamDto = ReturnType<typeof examDto>;
