import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Timestamps are unix epoch milliseconds. Calendar days ("YYYY-MM-DD") are in APP_TIMEZONE.

export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    createdAt: integer('created_at').notNull(),
    imageFile: text('image_file').notNull(),
    imageMime: text('image_mime').notNull(),
    exam: text('exam', { enum: ['TYT', 'AYT'] }).notNull(),
    subject: text('subject').notNull(),
    topicId: text('topic_id').notNull(),
    difficulty: integer('difficulty').notNull(),
    questionText: text('question_text').notNull(),
    hints: text('hints', { mode: 'json' }).$type<string[]>().notNull(),
    solutionSteps: text('solution_steps', { mode: 'json' }).$type<string[]>().notNull(),
    finalAnswer: text('final_answer').notNull(),
    confidence: real('confidence').notNull(),
    model: text('model').notNull(),
  },
  (t) => [
    index('questions_created_at_idx').on(t.createdAt),
    index('questions_subject_topic_idx').on(t.subject, t.topicId),
  ],
);

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    // 'solve' = first attempt right after solving, 'review' = spaced-repetition attempt.
    source: text('source', { enum: ['solve', 'review'] }).notNull(),
    result: text('result', { enum: ['correct', 'wrong', 'blank'] }).notNull(),
    userAnswer: text('user_answer'),
    hintsUsed: integer('hints_used').notNull().default(0),
    viewedSolution: integer('viewed_solution', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('attempts_question_idx').on(t.questionId), index('attempts_created_at_idx').on(t.createdAt)],
);

// Spaced-repetition queue (Phase 2). One row per question that entered the queue.
// `stage` indexes into the interval list [1, 3, 7, 14, 30] days.
export const reviews = sqliteTable(
  'reviews',
  {
    questionId: text('question_id')
      .primaryKey()
      .references(() => questions.id, { onDelete: 'cascade' }),
    stage: integer('stage').notNull().default(0),
    dueDate: text('due_date').notNull(),
    status: text('status', { enum: ['active', 'graduated'] }).notNull().default('active'),
    correctCount: integer('correct_count').notNull().default(0),
    lastResult: text('last_result', { enum: ['correct', 'wrong', 'blank'] }),
    lastReviewedAt: integer('last_reviewed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('reviews_due_idx').on(t.status, t.dueDate)],
);

export interface ExamTopicResult {
  topicId: string;
  correct: number;
  wrong: number;
  blank: number;
}

export interface ExamSectionResult {
  subject: string;
  correct: number;
  wrong: number;
  blank: number;
  topics?: ExamTopicResult[];
}

// Deneme results (Phase 3).
export const exams = sqliteTable(
  'exams',
  {
    id: text('id').primaryKey(),
    createdAt: integer('created_at').notNull(),
    date: text('date').notNull(),
    exam: text('exam', { enum: ['TYT', 'AYT'] }).notNull(),
    name: text('name'),
    sections: text('sections', { mode: 'json' }).$type<ExamSectionResult[]>().notNull(),
    imageFile: text('image_file'),
  },
  (t) => [index('exams_date_idx').on(t.date)],
);

// Study timer sessions (Phase 4).
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['focus', 'break'] }).notNull(),
    subject: text('subject'),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at').notNull(),
    durationSec: integer('duration_sec').notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull(),
    date: text('date').notNull(),
  },
  (t) => [index('sessions_date_idx').on(t.date)],
);

export interface EarnedBadge {
  id: string;
  earnedAt: number;
}

export interface ProfileSettings {
  focusMinutes: number;
  breakMinutes: number;
}

export const DEFAULT_SETTINGS: ProfileSettings = { focusMinutes: 25, breakMinutes: 5 };

// Single-row table (id = 1): gamification state and settings.
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  xp: integer('xp').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastStreakDate: text('last_streak_date'),
  badges: text('badges', { mode: 'json' }).$type<EarnedBadge[]>().notNull().default([]),
  settings: text('settings', { mode: 'json' }).$type<ProfileSettings>().notNull().default(DEFAULT_SETTINGS),
});
