import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayOf } from './companionRules';

// What Lumi remembers per account, on the device at `derece.companion.<userId>`: today's
// ledger (which lines showed, how many unsolicited, when), the snooze, the highlights
// still standing, when the student was last here, and the one-time intro and tips. It is
// wiped when the signed-in account changes (the same moment the root clears its caches).

export interface CompanionMemory {
  /** The day the ledger belongs to ("YYYY-MM-DD"); a new day resets it. */
  day: string;
  shownIds: string[];
  unsolicitedToday: number;
  /** The last unsolicited line (ms epoch). */
  lastAt: number;
  snoozedUntil: number;
  /** Highlight persist keys still standing (see `highlightKey`). */
  marked: string[];
  /** The last time the app was active (ms epoch), for the "welcome back" lines. */
  lastActiveAt: number;
  /** The intro line ("Selam, ben Lumi") has been shown. */
  firstRunDone: boolean;
  /** Tap tips already shown, rotated in order. */
  tipsShown: string[];
  /** The day's signature highlight flight has played. */
  signatureDay: string;
}

export const emptyMemory = (now = Date.now()): CompanionMemory => ({
  day: dayOf(now),
  shownIds: [],
  unsolicitedToday: 0,
  lastAt: 0,
  snoozedUntil: 0,
  marked: [],
  lastActiveAt: 0,
  firstRunDone: false,
  tipsShown: [],
  signatureDay: '',
});

const key = (userId: string) => `derece.companion.${userId}`;

/**
 * The persist key a Highlight uses for a mark Lumi drew today: the target id plus the day
 * (design spec 7.1: "persistKey = id + day"). Screens pass this as `<Highlight persistKey>`.
 */
export function highlightKey(id: string, now = Date.now()): string {
  return `${id}@${dayOf(now)}`;
}

/** Rolls the ledger over to a new day: today's counters reset, yesterday's marks drop. */
export function rollDay(m: CompanionMemory, now = Date.now()): CompanionMemory {
  const day = dayOf(now);
  if (m.day === day) return m;
  return {
    ...m,
    day,
    shownIds: [],
    unsolicitedToday: 0,
    marked: m.marked.filter((k) => k.endsWith(`@${day}`)),
  };
}

function parse(raw: string | null, now: number): CompanionMemory {
  const base = emptyMemory(now);
  if (!raw) return base;
  try {
    const v = JSON.parse(raw) as Partial<CompanionMemory>;
    const strings = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []);
    const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
    return rollDay(
      {
        day: typeof v.day === 'string' ? v.day : base.day,
        shownIds: strings(v.shownIds),
        unsolicitedToday: num(v.unsolicitedToday),
        lastAt: num(v.lastAt),
        snoozedUntil: num(v.snoozedUntil),
        marked: strings(v.marked),
        lastActiveAt: num(v.lastActiveAt),
        firstRunDone: v.firstRunDone === true,
        tipsShown: strings(v.tipsShown),
        signatureDay: typeof v.signatureDay === 'string' ? v.signatureDay : '',
      },
      now,
    );
  } catch {
    return base;
  }
}

export async function loadMemory(userId: string, now = Date.now()): Promise<CompanionMemory> {
  const raw = await AsyncStorage.getItem(key(userId)).catch(() => null);
  return parse(raw, now);
}

export function saveMemory(userId: string, m: CompanionMemory): Promise<void> {
  return AsyncStorage.setItem(key(userId), JSON.stringify(m)).catch(() => {});
}

export function clearMemory(userId: string): Promise<void> {
  return AsyncStorage.removeItem(key(userId)).catch(() => {});
}
