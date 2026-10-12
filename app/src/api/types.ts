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

export interface ReviewState {
  stage: number;
  /** The interval (days) that produced `dueDate`. */
  intervalDays: number;
  dueDate: string;
  status: 'active' | 'graduated';
  correctCount: number;
  lastResult: AttemptResult | null;
  lastReviewedAt: string | null;
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
  review: ReviewState | null;
  messageCount: number;
}

export interface QuestionPage {
  items: Question[];
  total: number;
  nextOffset: number | null;
}

export interface QuestionFilter {
  subject?: string | null;
  topicId?: string | null;
}

export interface Facets {
  total: number;
  subjects: { subject: string; count: number }[];
  topics: { topicId: string; count: number }[];
}

export interface ReviewsToday {
  today: string;
  items: Question[];
  completedToday: number;
}

export interface ReviewResultResponse {
  review: ReviewState;
  attempt: Attempt;
  xpGained: number;
  profile: Profile;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatThread {
  items: ChatMessage[];
  /** Max follow-up questions per solved question. */
  limit: number;
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
