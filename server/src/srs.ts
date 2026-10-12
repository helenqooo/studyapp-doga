// Spaced repetition: a simple SM-2-like ladder of fixed intervals.
// Correct → next interval; wrong → back to the first. Passing the last interval graduates the card.

import { addDays } from './time';

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface ReviewSchedule {
  /** Index into REVIEW_INTERVALS of the interval that produced `dueDate`. */
  stage: number;
  dueDate: string;
  status: 'active' | 'graduated';
}

/** A question that was answered wrong or left blank enters the queue for tomorrow. */
export function initialSchedule(today: string): ReviewSchedule {
  return { stage: 0, dueDate: addDays(today, REVIEW_INTERVALS[0]), status: 'active' };
}

export function nextSchedule(stage: number, correct: boolean, today: string): ReviewSchedule {
  if (!correct) return initialSchedule(today);
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS.length) {
    return { stage: REVIEW_INTERVALS.length - 1, dueDate: today, status: 'graduated' };
  }
  return { stage: next, dueDate: addDays(today, REVIEW_INTERVALS[next]!), status: 'active' };
}

export function intervalDays(stage: number): number {
  return REVIEW_INTERVALS[Math.min(Math.max(stage, 0), REVIEW_INTERVALS.length - 1)]!;
}
