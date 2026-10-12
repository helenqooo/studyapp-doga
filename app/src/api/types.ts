// Mirrors the server DTOs in server/src/dto.ts.

import type { Exam } from '../data/topics';

export type AttemptResult = 'correct' | 'wrong' | 'blank';

export interface Attempt {
  id: string;
  createdAt: string;
  source: 'solve' | 'review';
  result: AttemptResult;
  userAnswer: string | null;
  hintsUsed: number;
  viewedSolution: boolean;
}

export interface Question {
  id: string;
  createdAt: string;
  exam: Exam;
  subject: string;
  topicId: string;
  difficulty: number;
  questionText: string;
  hints: string[];
  solutionSteps: string[];
  finalAnswer: string;
  confidence: number;
  attempts: Attempt[];
}

export interface Profile {
  xp: number;
  level: number;
  levelXp: number;
  levelXpRequired: number;
  streak: number;
  longestStreak: number;
  badges: { id: string; earnedAt: number }[];
  settings: { focusMinutes: number; breakMinutes: number };
}

export interface AttemptInput {
  result: AttemptResult;
  userAnswer?: string | null;
  hintsUsed: number;
  viewedSolution: boolean;
}

export interface AttemptResponse {
  attempt: Attempt;
  xpGained: number;
  profile: Profile;
}
