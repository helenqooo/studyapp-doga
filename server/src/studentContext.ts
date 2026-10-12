import { and, eq, gte } from 'drizzle-orm';
import { YKS_DATE } from './brand';
import type { Db } from './db/client';
import { profiles, sessions, users } from './db/schema';
import { effectiveStreak, levelFromXp } from './gamification';
import { computeOverview } from './stats';
import { addDays, localDate } from './time';
import { getTopic, topicLabel } from './topics';

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

/**
 * A plain-text snapshot of where the student stands right now, for the assistant: profile,
 * today's work, reviews, exams and weakest topics. Only facts from the database.
 */
export function studentContext(db: Db, userId: string, ts: number, timeZone: string): string {
  const today = localDate(ts, timeZone);
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const profile = db.select().from(profiles).where(eq(profiles.userId, userId)).get();
  const overview = computeOverview(db, userId, ts, timeZone);
  const lines: string[] = [];

  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(new Date(ts)),
  );
  const weekday = WEEKDAYS[new Date(`${today}T00:00:00Z`).getUTCDay()];
  const daysLeft = dayNumber(YKS_DATE) - dayNumber(today);
  lines.push(`Name: ${user?.displayName ?? 'öğrenci'}`);
  lines.push(`Now: ${today} (${weekday}), around ${hour}:00 local time`);
  if (daysLeft > 0) lines.push(`Days until YKS (${YKS_DATE}): ${daysLeft}`);

  if (profile) {
    const level = levelFromXp(profile.xp);
    const streak = effectiveStreak(profile.currentStreak, profile.lastStreakDate, today);
    lines.push(
      `Level ${level.level} (${profile.xp} XP total), streak ${streak} day(s)${profile.lastStreakDate === today ? ', today already counts' : streak > 0 ? ', today not counted yet' : ''}, longest streak ${profile.longestStreak}, badges ${profile.badges.length}`,
    );
  }

  // Study time: today and the last 7 days.
  const weekAgo = addDays(today, -6);
  const recent = db
    .select({ date: sessions.date, kind: sessions.kind, durationSec: sessions.durationSec, subject: sessions.subject, completed: sessions.completed })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gte(sessions.date, weekAgo)))
    .all()
    .filter((s) => s.kind === 'focus');
  const todayFocus = recent.filter((s) => s.date === today);
  const minutes = (list: typeof recent) => Math.round(list.reduce((sum, s) => sum + s.durationSec, 0) / 60);
  const bySubject = new Map<string, number>();
  for (const s of recent) bySubject.set(s.subject ?? 'etiketsiz', (bySubject.get(s.subject ?? 'etiketsiz') ?? 0) + s.durationSec);
  lines.push(
    `Focus time: today ${minutes(todayFocus)} min (${todayFocus.filter((s) => s.completed).length} pomodoros), last 7 days ${minutes(recent)} min${
      bySubject.size
        ? ` (${[...bySubject].sort((a, b) => b[1] - a[1]).map(([s, sec]) => `${s} ${Math.round(sec / 60)}`).join(', ')})`
        : ''
    }`,
  );

  const p = overview.practice;
  lines.push(`Reviews: ${p.dueToday} due today, ${p.activeReviews} in the queue`);
  if (p.attempts) {
    lines.push(`Practice questions (last ${overview.windowDays} days): ${p.attempts} answered, ${p.correct} correct, ${p.wrong} wrong, ${p.blank} blank`);
  } else {
    lines.push('Practice questions: none answered yet');
  }

  for (const exam of ['TYT', 'AYT'] as const) {
    const s = overview.byExam[exam];
    if (!s.count) {
      lines.push(`${exam} exams: none entered yet`);
      continue;
    }
    const last = s.trend.slice(-3).map((t) => `${t.date} ${t.totalNet} net${t.complete ? '' : ' (partial)'}`);
    const subjects = s.subjects
      .filter((x) => x.latestNet !== null)
      .map((x) => `${x.subject} ${x.latestNet}/${x.questions}${x.previousNet !== null ? ` (prev ${x.previousNet})` : ''}`);
    lines.push(`${exam} exams: ${s.count} entered; last: ${last.join('; ')}; latest by subject: ${subjects.join(', ')}`);
  }

  const losses = overview.topicLosses.slice(0, 5).map((t) => {
    const topic = getTopic(t.topicId);
    return `${topic ? `${topic.exam} ${topicLabel(topic)}` : t.topicId} (−${t.lostNet} net)`;
  });
  lines.push(losses.length ? `Topics losing the most net: ${losses.join('; ')}` : 'Topics losing the most net: not enough data yet');

  return lines.join('\n');
}
