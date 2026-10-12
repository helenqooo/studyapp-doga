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

export interface ExamTopicResult {
  topicId: string;
  correct: number;
  wrong: number;
  blank: number;
}

export interface ExamSectionInput {
  subject: string;
  correct: number;
  wrong: number;
  blank: number;
  topics?: ExamTopicResult[];
}

export interface ExamInput {
  exam: Exam;
  date: string;
  name: string | null;
  sections: ExamSectionInput[];
}

export interface ExamSection extends ExamSectionInput {
  questions: number;
  net: number;
  topics: (ExamTopicResult & { net: number })[];
}

export interface ExamResult {
  id: string;
  createdAt: string;
  date: string;
  exam: Exam;
  name: string | null;
  sections: ExamSection[];
  totalNet: number;
  totalQuestions: number;
}

/** Pre-filled form values read from a karne photo (not saved yet). */
export interface KarneDraft {
  exam: Exam;
  name: string | null;
  date: string | null;
  sections: ExamSectionInput[];
  confidence: number;
  warnings: string[];
}

export interface TrendPoint {
  id: string;
  date: string;
  name: string | null;
  totalNet: number;
  totalQuestions: number;
  complete: boolean;
  sections: Record<string, number>;
}

export interface SubjectSummary {
  subject: string;
  questions: number;
  count: number;
  latestNet: number | null;
  previousNet: number | null;
  averageNet: number | null;
  bestNet: number | null;
}

export interface TopicLoss {
  topicId: string;
  subject: string | null;
  lostNet: number;
  examLost: number;
  practiceLost: number;
  examCorrect: number;
  examWrong: number;
  examBlank: number;
  practiceCorrect: number;
  practiceWrong: number;
  practiceBlank: number;
}

export interface Overview {
  today: string;
  windowDays: number;
  byExam: Record<Exam, { count: number; maxNet: number; trend: TrendPoint[]; subjects: SubjectSummary[] }>;
  topicLosses: TopicLoss[];
  practice: { attempts: number; correct: number; wrong: number; blank: number; activeReviews: number; dueToday: number };
}

export type WeeklySummary =
  | { status: 'insufficient' }
  | {
      status: 'ok';
      weekStart: string;
      generatedAt: string;
      summary: string;
      priorities: { topicId: string; reason: string }[];
    };
