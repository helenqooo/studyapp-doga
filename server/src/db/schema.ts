import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Timestamps are unix epoch milliseconds. Calendar days ("YYYY-MM-DD") are in APP_TIMEZONE.
//
// Multi-user: every owned row carries `user_id`. The column is nullable only because rows
// from the single-user version had none; the first account to register claims them
// (src/users.ts). New rows always set it.

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Lowercase login name, unique. */
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    /** Avatar color key (see the app's theme `avatar` palette). */
    avatar: text('avatar').notNull().default('clay'),
    /** "scrypt$N$r$p$salt$hash" (base64 salt and hash). */
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_username_idx').on(t.username)],
);

// Login sessions: the app sends the token as "Authorization: Bearer <token>"; only its
// SHA-256 is stored.
export const authTokens = sqliteTable(
  'auth_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at').notNull(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId)],
);

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
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('questions_created_at_idx').on(t.createdAt),
    index('questions_subject_topic_idx').on(t.subject, t.topicId),
    index('questions_user_created_idx').on(t.userId, t.createdAt),
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
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('attempts_question_idx').on(t.questionId),
    index('attempts_created_at_idx').on(t.createdAt),
    index('attempts_user_created_idx').on(t.userId, t.createdAt),
  ],
);

// Spaced-repetition queue. One row per question that entered the queue.
// `stage` indexes into REVIEW_INTERVALS (src/srs.ts).
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
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('reviews_due_idx').on(t.status, t.dueDate), index('reviews_user_due_idx').on(t.userId, t.status, t.dueDate)],
);

// "Anlamadım" follow-up chat about a solved question.
export const questionMessages = sqliteTable(
  'question_messages',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('question_messages_question_idx').on(t.questionId, t.createdAt)],
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

// Deneme results. Sections hold D/Y/B per exam section, optionally per topic.
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
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('exams_date_idx').on(t.date), index('exams_user_date_idx').on(t.userId, t.date)],
);

// Study timer sessions (pomodoro). `date` is the local day the session started.
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
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('sessions_date_idx').on(t.date), index('sessions_user_date_idx').on(t.userId, t.date)],
);

// AI weekly priorities, one row per user and week (Monday, APP_TIMEZONE).
export const weeklySummaries = sqliteTable(
  'weekly_summaries',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekStart: text('week_start').notNull(),
    createdAt: integer('created_at').notNull(),
    summary: text('summary').notNull(),
    priorities: text('priorities', { mode: 'json' }).$type<{ topicId: string; reason: string }[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] })],
);

// Every XP gain, so the leaderboard can sum a week. `date` is the local day.
export const xpEvents = sqliteTable(
  'xp_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    reason: text('reason', { enum: ['solve', 'review', 'pomodoro', 'exam'] }).notNull(),
    createdAt: integer('created_at').notNull(),
    date: text('date').notNull(),
  },
  (t) => [index('xp_events_user_date_idx').on(t.userId, t.date), index('xp_events_date_idx').on(t.date)],
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

// Per-user gamification state and settings.
export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  xp: integer('xp').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastStreakDate: text('last_streak_date'),
  badges: text('badges', { mode: 'json' }).$type<EarnedBadge[]>().notNull().default([]),
  settings: text('settings', { mode: 'json' }).$type<ProfileSettings>().notNull().default(DEFAULT_SETTINGS),
});

// Single-user era (id = 1). Read once when the first account claims the existing data.
export const legacyProfile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  xp: integer('xp').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastStreakDate: text('last_streak_date'),
  badges: text('badges', { mode: 'json' }).$type<EarnedBadge[]>().notNull().default([]),
  settings: text('settings', { mode: 'json' }).$type<ProfileSettings>().notNull().default(DEFAULT_SETTINGS),
});
