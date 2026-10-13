import type { TalkLevel } from '../store/prefsStore';
import { motion } from '../theme';

// Lumi's manners (design spec 6.8), as pure functions so they can be unit-tested: how often
// it may speak up on its own, when it must stay quiet, where it may appear, and how long a
// note stays. Nothing here reads a store or the clock by itself; callers pass `now`.

/** Unsolicited lines per day and the minimum gap between them, by talk level. */
export const TALK_CAPS: Record<TalkLevel, { perDay: number; gapMs: number; flights: boolean }> = {
  often: { perDay: 8, gapMs: 8 * 60_000, flights: true },
  sometimes: { perDay: 5, gapMs: 15 * 60_000, flights: true },
  quiet: { perDay: 0, gapMs: Infinity, flights: false },
};

/** Quiet hours, in minutes after local midnight: 00:30 until 07:00 (taps still answer). */
export const QUIET_HOURS = { from: 30, to: 7 * 60 } as const;

/** A queued line is dropped after this long. */
export const LINE_TTL_MS = 10 * 60_000;

/** Minutes after local midnight. */
export function minuteOfDay(now: number): number {
  const d = new Date(now);
  return d.getHours() * 60 + d.getMinutes();
}

export function isQuietHours(now: number): boolean {
  const m = minuteOfDay(now);
  return m >= QUIET_HOURS.from && m < QUIET_HOURS.to;
}

/** Device-local calendar day "YYYY-MM-DD" for a timestamp. */
export function dayOf(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The next local midnight (the end of a "Sessiz ol" snooze). */
export function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Whole local days between two timestamps (calendar days, not 24 h blocks). */
export function daysApart(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/**
 * Routes where the companion may show (section 6.3). Everything else renders its own Lumi
 * or needs full attention (question, review-session, assistant, login, camera, crop,
 * topic-picker, exam/new, exam edit).
 */
const ALLOWED = new Set(['/', '/solve', '/review', '/exams', '/profile', '/timer', '/leaderboard']);
const EXAM_DETAIL = /^\/exam\/(?!new$)[^/]+$/;

export function isCompanionRoute(pathname: string, dev = false): boolean {
  if (ALLOWED.has(pathname)) return true;
  if (EXAM_DETAIL.test(pathname)) return true;
  return dev && pathname === '/dev-lumi';
}

/** The five tab routes (the strip is on screen); anything else is a stack screen. */
export const TAB_ROUTES = ['/', '/solve', '/review', '/exams', '/profile'] as const;
export function isTabRoute(pathname: string): boolean {
  return (TAB_ROUTES as readonly string[]).includes(pathname);
}

/** How long a note stays: min(base + per character, max), in ms. */
export function holdMs(text: string, t: { holdBaseMs: number; holdPerCharMs: number; holdMaxMs: number }): number {
  return Math.min(t.holdBaseMs + t.holdPerCharMs * text.length, t.holdMaxMs);
}

/** What the daily ledger remembers (the persisted part the rules need). */
export interface Ledger {
  /** Line ids shown today. */
  shownIds: string[];
  /** Unsolicited lines shown today. */
  unsolicitedToday: number;
  /** When the last unsolicited line showed (ms epoch, 0 = never). */
  lastAt: number;
  /** Snoozed (Sessiz ol) until this time. */
  snoozedUntil: number;
}

/** Live conditions at the moment a line wants to show. */
export interface Moment {
  now: number;
  talk: TalkLevel;
  pathname: string;
  /** When the current screen was entered. */
  enteredAt: number;
  /** The last touch or scroll the companion saw. */
  lastTouchAt: number;
  /** An unsolicited line already showed during this screen visit. */
  spokeThisVisit: boolean;
  focusRunning: boolean;
  keyboard: boolean;
  celebrating: boolean;
  /** Lumi is visible here at all (route allowed, nothing in-tree yielding). */
  visible: boolean;
}

export type RuleTiming = Pick<typeof motion.companion, 'dwellMs' | 'quietAfterTouchMs' | 'navQuietMs'>;

export type Verdict = { ok: true } | { ok: false; reason: string };

/**
 * May an unsolicited line show now? Section 6.8: caps by talk level, the minimum gap, one
 * per screen visit after a dwell, nothing right after a navigation or touch, quiet hours,
 * snooze, focus, keyboard, celebrations and hidden routes. `dwellMs` can be shortened for
 * the first-open signature moment (Home's entrance replaces the dwell).
 */
export function canSpeakUnsolicited(l: Ledger, m: Moment, opts: { dwellMs?: number; timing?: RuleTiming } = {}): Verdict {
  const t = opts.timing ?? motion.companion;
  const cap = TALK_CAPS[m.talk];
  if (!m.visible) return { ok: false, reason: 'hidden' };
  if (isSnoozed(l, m.now)) return { ok: false, reason: 'snoozed' };
  if (cap.perDay <= 0) return { ok: false, reason: 'quiet level' };
  if (isQuietHours(m.now)) return { ok: false, reason: 'quiet hours' };
  if (m.focusRunning) return { ok: false, reason: 'focus' };
  if (m.keyboard) return { ok: false, reason: 'keyboard' };
  if (m.celebrating) return { ok: false, reason: 'celebrating' };
  if (l.unsolicitedToday >= cap.perDay) return { ok: false, reason: 'daily cap' };
  if (l.lastAt && m.now - l.lastAt < cap.gapMs) return { ok: false, reason: 'gap' };
  if (m.spokeThisVisit) return { ok: false, reason: 'once per visit' };
  if (m.now - m.enteredAt < Math.max(opts.dwellMs ?? t.dwellMs, t.navQuietMs)) return { ok: false, reason: 'dwell' };
  if (m.now - m.lastTouchAt < t.quietAfterTouchMs) return { ok: false, reason: 'touch' };
  return { ok: true };
}

/** Snoozed right now. */
export function isSnoozed(l: Pick<Ledger, 'snoozedUntil'>, now: number): boolean {
  return l.snoozedUntil > now;
}

/** May a line with this id show today (each id at most once a day, unless it repeats)? */
export function freshToday(l: Pick<Ledger, 'shownIds'>, id: string, repeats = false): boolean {
  return repeats || !l.shownIds.includes(id);
}

/** Is a highlight flight allowed at this talk level (Sessiz: never)? */
export function canFly(talk: TalkLevel, reduceMotion: boolean): boolean {
  return TALK_CAPS[talk].flights && !reduceMotion;
}
