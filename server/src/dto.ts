import type { attempts, profile, questions } from './db/schema';
import { levelFromXp } from './gamification';

type QuestionRow = typeof questions.$inferSelect;
type AttemptRow = typeof attempts.$inferSelect;
type ProfileRow = typeof profile.$inferSelect;

export function attemptDto(a: AttemptRow) {
  return {
    id: a.id,
    createdAt: new Date(a.createdAt).toISOString(),
    source: a.source,
    result: a.result,
    userAnswer: a.userAnswer,
    hintsUsed: a.hintsUsed,
    viewedSolution: a.viewedSolution,
  };
}

export function questionDto(q: QuestionRow, questionAttempts: AttemptRow[] = []) {
  return {
    id: q.id,
    createdAt: new Date(q.createdAt).toISOString(),
    exam: q.exam,
    subject: q.subject,
    topicId: q.topicId,
    difficulty: q.difficulty,
    questionText: q.questionText,
    hints: q.hints,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    confidence: q.confidence,
    attempts: questionAttempts.map(attemptDto),
  };
}

export function profileDto(p: ProfileRow) {
  return {
    xp: p.xp,
    ...levelFromXp(p.xp),
    streak: p.currentStreak,
    longestStreak: p.longestStreak,
    badges: p.badges,
    settings: p.settings,
  };
}
