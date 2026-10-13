import type { ExamResult } from '../../api/types';
import { QUESTION_COUNTS, SUBJECTS_BY_EXAM, type Exam, type Subject } from '../../data/topics';

/** Questions in a full exam of this type (TYT 120, AYT 80). */
export function examMax(exam: Exam): number {
  return SUBJECTS_BY_EXAM[exam].reduce((sum, s) => sum + QUESTION_COUNTS[s], 0);
}

/** A full exam (every section entered); branş exams would distort totals and deltas. */
export function isComplete(e: Pick<ExamResult, 'exam' | 'sections'>): boolean {
  return SUBJECTS_BY_EXAM[e.exam].every((s) => e.sections.some((x) => x.subject === s));
}

/** Newest first: by exam date, then by entry time. */
export function newestFirst<T extends Pick<ExamResult, 'date' | 'createdAt'>>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

/** The full exam of the same type taken before `e` (null when there is none, or `e` is partial). */
export function previousOf(e: ExamResult, all: readonly ExamResult[]): ExamResult | null {
  if (!isComplete(e)) return null;
  const sorted = newestFirst(all.filter((x) => x.exam === e.exam && isComplete(x)));
  const at = sorted.findIndex((x) => x.id === e.id);
  if (at >= 0) return sorted[at + 1] ?? null;
  // Not in the list yet (just saved): the newest one older than or on its date.
  return sorted.find((x) => x.id !== e.id && x.date <= e.date) ?? null;
}

/** Nets lost on a topic: each wrong costs 1,25 (the point plus a quarter), each blank 1. */
export const lostNet = (t: { wrong: number; blank: number }) => t.wrong * 1.25 + t.blank;

export const subjectsOf = (exam: Exam): Subject[] => SUBJECTS_BY_EXAM[exam];
