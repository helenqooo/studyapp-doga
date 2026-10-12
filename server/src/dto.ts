import type { attempts, profiles, questionMessages, questions, reviews } from './db/schema';
import { effectiveStreak, levelFromXp } from './gamification';
import { intervalDays } from './srs';

type QuestionRow = typeof questions.$inferSelect;
type AttemptRow = typeof attempts.$inferSelect;
type ReviewRow = typeof reviews.$inferSelect;
type MessageRow = typeof questionMessages.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

const iso = (ts: number) => new Date(ts).toISOString();

export function attemptDto(a: AttemptRow) {
  return {
    id: a.id,
    createdAt: iso(a.createdAt),
    source: a.source,
    result: a.result,
    userAnswer: a.userAnswer,
    hintsUsed: a.hintsUsed,
    viewedSolution: a.viewedSolution,
  };
}

export function reviewDto(r: ReviewRow) {
  return {
    stage: r.stage,
    intervalDays: intervalDays(r.stage),
    dueDate: r.dueDate,
    status: r.status,
    correctCount: r.correctCount,
    lastResult: r.lastResult,
    lastReviewedAt: r.lastReviewedAt ? iso(r.lastReviewedAt) : null,
  };
}

export interface QuestionExtras {
  attempts?: AttemptRow[];
  review?: ReviewRow | null;
  messageCount?: number;
}

export function questionDto(q: QuestionRow, extras: QuestionExtras = {}) {
  return {
    id: q.id,
    createdAt: iso(q.createdAt),
    exam: q.exam,
    subject: q.subject,
    topicId: q.topicId,
    difficulty: q.difficulty,
    questionText: q.questionText,
    hints: q.hints,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    confidence: q.confidence,
    attempts: (extras.attempts ?? []).map(attemptDto),
    review: extras.review ? reviewDto(extras.review) : null,
    messageCount: extras.messageCount ?? 0,
  };
}

export function messageDto(m: MessageRow) {
  return { id: m.id, role: m.role, content: m.content, createdAt: iso(m.createdAt) };
}

/** `today` (local date) decides whether the stored streak is still alive. */
export function profileDto(p: ProfileRow, today: string) {
  return {
    xp: p.xp,
    ...levelFromXp(p.xp),
    streak: effectiveStreak(p.currentStreak, p.lastStreakDate, today),
    /** Today already counts toward the streak. */
    streakToday: p.lastStreakDate === today,
    longestStreak: p.longestStreak,
    badges: p.badges,
    settings: p.settings,
  };
}
