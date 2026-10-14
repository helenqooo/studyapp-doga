import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useCallback, useRef } from 'react';
import { api } from '../api/client';
import { queryKeys, useProfile, useReviewsToday, useStudyDay } from '../api/hooks';
import { DAILY_GOALS } from '../config';
import { BADGES } from '../data/badges';
import { YKS_DATE } from '../data/exam';
import { getTopic } from '../data/topics';
import { useAuthStore } from '../store/authStore';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { companion } from '../theme';
import { daysApart, minuteOfDay } from './companionRules';
import type { LineContext } from './lumiLines';

/** What the companion remembers that the context needs (from companionPersist). */
export interface ContextMemory {
  firstOpenToday: boolean;
  lastActiveAt: number;
  firstRun: boolean;
}

const DAY_MS = 86_400_000;
const STREAK_BADGES = [
  { id: 'streak-7', days: 7 },
  { id: 'streak-30', days: 30 },
];

/** Whole days from one "YYYY-MM-DD" to another. */
function dayDiff(from: string, to: string): number {
  const ms = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    return Date.UTC(y!, m! - 1, dd!);
  };
  return Math.round((ms(to) - ms(from)) / DAY_MS);
}

/**
 * Everything the line bank reads, from warm or cheap sources only (design spec 6.1): the
 * profile, today's reviews and study day, the timer, the account and the route. Exams and
 * the weekly board load only on their own screens; the weekly summary is never read.
 * Returns a stable reader: call it with `now` and the companion's memory when a line is due.
 */
export function useCompanionContext(): (now: number, mem: ContextMemory) => LineContext {
  const pathname = usePathname();
  const profile = useProfile().data;
  const reviews = useReviewsToday().data;
  const day = useStudyDay().data;
  const timer = useTimerStore();
  const user = useAuthStore((s) => s.user);
  const onExams = pathname === '/exams';
  const onBoard = pathname === '/' || pathname === '/leaderboard';
  const exams = useQuery({ queryKey: queryKeys.exams, queryFn: api.exams, enabled: onExams }).data;
  const board = useQuery({ queryKey: queryKeys.leaderboardPeriod('week'), queryFn: () => api.leaderboard('week'), enabled: onBoard }).data;

  // The timer store keeps no pause time; remember when this pause began (lost on restart, fine).
  const pausedSince = useRef<number | null>(null);
  const pausedNow = timer.phase !== 'idle' && timer.endsAt === null;
  if (!pausedNow) pausedSince.current = null;
  else if (pausedSince.current === null) pausedSince.current = Date.now();

  const live = useRef({ pathname, profile, reviews, day, timer, user, exams, board, onExams, onBoard });
  live.current = { pathname, profile, reviews, day, timer, user, exams, board, onExams, onBoard };

  return useCallback((now: number, mem: ContextMemory): LineContext => {
    const { pathname: path, profile: p, reviews: r, day: d, timer: t, user: u, exams: ex, board: b, onExams: oe, onBoard: ob } = live.current;
    const date = new Date(now);
    const today = r?.today ?? null;
    const due = r ? r.items.length : null;

    let oldest: LineContext['oldest'] = null;
    if (r && today) {
      for (const q of r.items) {
        const dueDate = q.review?.dueDate;
        if (!dueDate) continue;
        const days = dayDiff(dueDate, today);
        if (!oldest || days > oldest.days) oldest = { topic: getTopic(q.topicId)?.topic ?? q.subject, days };
      }
    }

    const running = t.phase !== 'idle';
    const remaining = running ? remainingMs(t, now) : 0;
    const since = pausedSince.current;
    const pausedMin = running && t.endsAt === null && since !== null ? Math.floor((now - since) / 60_000) : null;

    let examsCtx: LineContext['exams'] = null;
    if (oe && ex) {
      const items = ex.items;
      const last = items.reduce<string | null>((acc, e) => (!acc || e.date > acc ? e.date : acc), null);
      const todayStr = today ?? new Date(now).toISOString().slice(0, 10);
      const lastDaysAgo = last ? dayDiff(last, todayStr) : null;
      examsCtx = { count: items.length, lastDaysAgo, thisWeek: lastDaysAgo !== null && lastDaysAgo < 7 };
    }

    let rival: LineContext['rival'] = null;
    if (ob && b) {
      const me = b.items.find((e) => e.isMe);
      const ahead = me ? b.items.filter((e) => e.xp > me.xp).at(-1) : undefined;
      if (me && ahead && ahead.displayName !== 'Sen') rival = { name: ahead.displayName, xp: ahead.xp - me.xp };
    }

    let badgeNear: LineContext['badgeNear'] = null;
    if (path === '/profile' && p) {
      const earned = new Set(p.badges.map((x) => x.id));
      for (const sb of STREAK_BADGES) {
        if (earned.has(sb.id) || p.streak !== sb.days - 1) continue;
        const info = BADGES.find((x) => x.id === sb.id);
        if (info) badgeNear = { id: sb.id, name: info.title, left: '1 gün' };
        break;
      }
    }

    const name = u?.displayName && u.displayName !== 'Sen' ? u.displayName : null;
    const awayDays = mem.lastActiveAt ? daysApart(mem.lastActiveAt, now) : 0;
    const awayHours = mem.lastActiveAt ? (now - mem.lastActiveAt) / 3_600_000 : 0;
    const yks = today ? dayDiff(today, YKS_DATE) : null;

    return {
      now,
      hour: date.getHours(),
      minute: minuteOfDay(now),
      weekday: date.getDay(),
      pathname: path,
      name,
      due,
      dueMinutes: Math.max(1, Math.round((due ?? 0) * companion.minutesPerReview)),
      oldest,
      reviewsDoneToday: r?.completedToday ?? 0,
      streak: p?.streak ?? 0,
      longest: p?.longestStreak ?? 0,
      streakToday: !!p?.streakToday,
      xpToNext: p ? p.levelXpRequired - p.levelXp : null,
      focusMinutes: Math.round((d?.focusSec ?? 0) / 60),
      focusGoal: DAILY_GOALS.focusMinutes,
      solvedToday: d?.solved ?? 0,
      solvedGoal: DAILY_GOALS.solved,
      timer: {
        phase: t.phase,
        remainingMin: Math.max(1, Math.ceil(remaining / 60_000)),
        pausedMin,
      },
      daysToYks: yks !== null && yks > 0 ? yks : null,
      exams: examsCtx,
      rival,
      badgeNear,
      firstOpenToday: mem.firstOpenToday,
      awayDays,
      awayHours,
      firstRun: mem.firstRun,
    };
  }, []);
}
