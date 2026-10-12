// Mirrors the server DTOs in server/src/dto.ts.

import type { Exam } from '../data/topics';
import type { Choice, ChoiceLabel } from '../lib/choices';

export type { Choice, ChoiceLabel };

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
  /** The stem; choices are listed separately. */
  questionText: string;
  /** Null for an open-ended question. */
  choices: Choice[] | null;
  /** The model's answer letter. */
  correctChoice: ChoiceLabel | null;
  /** The student's answer key letter, if set; it wins over correctChoice. */
  answerKey: ChoiceLabel | null;
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

/** What an action earned: XP, a level crossed, new badges, a longer streak. */
export interface Rewards {
  xpGained: number;
  levelUp: number | null;
  badges: { id: string; earnedAt: string }[];
  /** New streak length when today started or extended it. */
  streak: number | null;
}

export interface ReviewResultResponse {
  review: ReviewState;
  attempt: Attempt;
  xpGained: number;
  rewards: Rewards;
  profile: Profile;
}

export interface ReviewResultInput {
  choice?: ChoiceLabel | null;
  /** Needed without a gradable choice ("Bilmiyorum" is wrong). */
  result?: 'correct' | 'wrong';
  viewedSolution: boolean;
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
  /** Today already counts toward the streak. */
  streakToday: boolean;
  longestStreak: number;
  badges: { id: string; earnedAt: number }[];
  settings: { focusMinutes: number; breakMinutes: number };
}

export interface AttemptInput {
  /** The picked choice; the server grades it when the answer letter is known. */
  choice?: ChoiceLabel | null;
  /** Needed without a gradable choice (blank, or an open-ended question). */
  result?: AttemptResult;
  userAnswer?: string | null;
  hintsUsed: number;
  viewedSolution: boolean;
}

export interface AttemptResponse {
  attempt: Attempt;
  xpGained: number;
  rewards: Rewards;
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

export type AvatarKey = 'clay' | 'kraft' | 'olive' | 'sky' | 'plum' | 'sand' | 'slate' | 'rose';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: AvatarKey;
}

export interface AuthConfig {
  registrationOpen: boolean;
  inviteRequired: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  username: string;
  displayName: string;
  password: string;
  inviteCode?: string;
  avatar?: AvatarKey;
}

export interface StudySessionInput {
  /** Client-made UUID; a retried upload is stored once. */
  id: string;
  kind: 'focus' | 'break';
  subject: string | null;
  startedAt: number;
  endedAt: number;
  completed: boolean;
}

export interface StudySession {
  id: string;
  kind: 'focus' | 'break';
  subject: string | null;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  completed: boolean;
  date: string;
}

export interface SessionResponse {
  session: StudySession;
  /** Null when the same session was already stored. */
  rewards: Rewards | null;
  profile?: Profile;
  duplicate?: boolean;
}

export interface StudyDay {
  date: string;
  items: StudySession[];
  focusSec: number;
  pomodoros: number;
  bySubject: { subject: string | null; seconds: number }[];
}

export interface StudyDays {
  days: { date: string; focusSec: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar: AvatarKey;
  level: number;
  streak: number;
  xp: number;
  isMe: boolean;
}

export interface Leaderboard {
  period: 'week' | 'all';
  weekStart: string;
  items: LeaderboardEntry[];
}
