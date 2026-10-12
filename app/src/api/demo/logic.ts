// Pure rules mirrored from the server (server/src/{srs,gamification,exams,time}.ts) so the
// demo behaves like the real app. Keep in sync if those change.

import { QUESTION_COUNTS, type Subject } from '../../data/topics';

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;
export const XP = { solveQuestion: 10, reviewCorrect: 15, pomodoroComplete: 20, examEntry: 50 } as const;
export const TOPIC_MASTER_REVIEWS = 10;
export const MIN_COUNTED_FOCUS_SEC = 5 * 60;
export const MAX_USER_MESSAGES = 10;
export const ANALYSIS_WINDOW_DAYS = 90;
export const PRACTICE_WEIGHT = 0.5;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const round2 = (n: number) => Math.round(n * 100) / 100;

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" in the device's time zone. */
export function localDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface Schedule {
  stage: number;
  dueDate: string;
  status: 'active' | 'graduated';
}

export function initialSchedule(today: string): Schedule {
  return { stage: 0, dueDate: addDays(today, REVIEW_INTERVALS[0]), status: 'active' };
}

export function nextSchedule(stage: number, correct: boolean, today: string): Schedule {
  if (!correct) return initialSchedule(today);
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS.length) return { stage: REVIEW_INTERVALS.length - 1, dueDate: today, status: 'graduated' };
  return { stage: next, dueDate: addDays(today, REVIEW_INTERVALS[next]!), status: 'active' };
}

export function intervalDays(stage: number): number {
  return REVIEW_INTERVALS[Math.min(Math.max(stage, 0), REVIEW_INTERVALS.length - 1)]!;
}

export function xpForLevel(level: number): number {
  return Math.round(100 * 1.2 ** (level - 1));
}

export function levelFromXp(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, levelXp: remaining, levelXpRequired: xpForLevel(level) };
}

export const net = (correct: number, wrong: number) => correct - wrong / 4;
export const lostNet = (wrong: number, blank: number) => wrong * 1.25 + blank;
export const questionCount = (subject: string) => QUESTION_COUNTS[subject as Subject] ?? 0;

export function effectiveStreak(current: number, lastStreakDate: string | null, today: string): number {
  return lastStreakDate && lastStreakDate >= addDays(today, -1) ? current : 0;
}

export function nextStreak(current: number, lastStreakDate: string | null, today: string) {
  if (lastStreakDate === today) return { current, grew: false };
  if (lastStreakDate === addDays(today, -1)) return { current: current + 1, grew: true };
  return { current: 1, grew: true };
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}
