import { and, count, eq, sql } from 'drizzle-orm';
import { topicMasterId } from './badges';
import type { Db } from './db/client';
import { attempts, exams, profiles, questions, xpEvents, type EarnedBadge } from './db/schema';
import { addDays } from './time';

export const XP = {
  solveQuestion: 10,
  reviewCorrect: 15,
  pomodoroComplete: 20,
  examEntry: 50,
} as const;

const BASE_LEVEL_XP = 100;
const LEVEL_GROWTH = 1.2;

/** Correct reviews in one topic that earn its "konu ustası" badge. */
export const TOPIC_MASTER_REVIEWS = 10;

/** XP needed to go from `level` to `level + 1` (each level ~20% more than the previous). */
export function xpForLevel(level: number): number {
  return Math.round(BASE_LEVEL_XP * LEVEL_GROWTH ** (level - 1));
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  levelXp: number;
  /** XP required to finish the current level. */
  levelXpRequired: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, levelXp: remaining, levelXpRequired: xpForLevel(level) };
}

/** Streak length as of `today`: a streak whose last day is before yesterday is broken. */
export function effectiveStreak(current: number, lastStreakDate: string | null, today: string): number {
  return lastStreakDate && lastStreakDate >= addDays(today, -1) ? current : 0;
}

/** Streak after a qualifying day (≥ 1 pomodoro, or the review queue cleared). */
export function nextStreak(current: number, lastStreakDate: string | null, today: string): { current: number; grew: boolean } {
  if (lastStreakDate === today) return { current, grew: false };
  if (lastStreakDate === addDays(today, -1)) return { current: current + 1, grew: true };
  return { current: 1, grew: true };
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type XpReason = (typeof xpEvents.$inferInsert)['reason'];

export interface Rewards {
  xpGained: number;
  /** The new level when this action crossed one. */
  levelUp: number | null;
  /** Badges earned by this action. */
  badges: { id: string; earnedAt: string }[];
  /** The new streak length when today started or extended it. */
  streak: number | null;
}

/** Badge ids the user qualifies for now (topic masters included). */
function qualifyingBadges(tx: Tx, userId: string, streak: number): string[] {
  const ids: string[] = [];
  const examCount = tx.select({ n: count() }).from(exams).where(eq(exams.userId, userId)).get()?.n ?? 0;
  if (examCount >= 1) ids.push('first-exam');
  if (streak >= 7) ids.push('streak-7');
  if (streak >= 30) ids.push('streak-30');
  const questionCount = tx.select({ n: count() }).from(questions).where(eq(questions.userId, userId)).get()?.n ?? 0;
  if (questionCount >= 100) ids.push('questions-100');
  if (questionCount >= 500) ids.push('questions-500');
  const masters = tx
    .select({ topicId: questions.topicId, n: count() })
    .from(attempts)
    .innerJoin(questions, eq(attempts.questionId, questions.id))
    .where(and(eq(attempts.userId, userId), eq(attempts.source, 'review'), eq(attempts.result, 'correct')))
    .groupBy(questions.topicId)
    .having(sql`count(*) >= ${TOPIC_MASTER_REVIEWS}`)
    .all();
  for (const m of masters) ids.push(topicMasterId(m.topicId));
  return ids;
}

/**
 * Applies the gamification side of an action inside its transaction: XP (logged for the
 * leaderboard), the streak when the action qualifies a day, and any badges now earned.
 */
export function applyRewards(
  tx: Tx,
  userId: string,
  opts: { xp: number; reason: XpReason; now: number; today: string; streakDay?: boolean },
) {
  const before = tx.select().from(profiles).where(eq(profiles.userId, userId)).get();
  if (!before) throw new Error(`profile missing for ${userId}`);

  if (opts.xp > 0) {
    tx.insert(xpEvents).values({ userId, amount: opts.xp, reason: opts.reason, createdAt: opts.now, date: opts.today }).run();
  }

  let { currentStreak, longestStreak, lastStreakDate } = before;
  let streakGrew = false;
  if (opts.streakDay) {
    const next = nextStreak(currentStreak, lastStreakDate, opts.today);
    currentStreak = next.current;
    streakGrew = next.grew;
    lastStreakDate = opts.today;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const owned = new Set(before.badges.map((b) => b.id));
  const earned: EarnedBadge[] = qualifyingBadges(tx, userId, effectiveStreak(currentStreak, lastStreakDate, opts.today))
    .filter((id) => !owned.has(id))
    .map((id) => ({ id, earnedAt: opts.now }));

  const xp = before.xp + opts.xp;
  const after = tx
    .update(profiles)
    .set({ xp, currentStreak, longestStreak, lastStreakDate, badges: [...before.badges, ...earned] })
    .where(eq(profiles.userId, userId))
    .returning()
    .get();

  const levelBefore = levelFromXp(before.xp).level;
  const levelAfter = levelFromXp(xp).level;
  const rewards: Rewards = {
    xpGained: opts.xp,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    badges: earned.map((b) => ({ id: b.id, earnedAt: new Date(b.earnedAt).toISOString() })),
    streak: streakGrew ? currentStreak : null,
  };
  return { rewards, profile: after };
}
