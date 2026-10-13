import type { Href } from 'expo-router';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { create } from 'zustand';
import type { MascotMood } from '../components/mascot/poses';

// Lumi, the companion: one Lumi on screen, owned by <CompanionHost/>. Screens and other
// packages never position it: they register perches and highlight targets, emit events
// and ask it to say lines. The API is frozen (design spec 6.2); the behavior and scheduling
// (lines, caps, flights) belong to the companion package.

/** Where Lumi is in its life cycle. */
export type Phase = 'hidden' | 'nest' | 'takeoff' | 'flying' | 'gliding' | 'perched' | 'returning' | 'sleeping';

/**
 * A rect in window coordinates (the space InlineBurst uses). An `anchored` rect moves with
 * the focused screen's scroll: `y_now = y - (activeScroll.value - scrollAt)`.
 */
export type Rect = { x: number; y: number; w: number; h: number; scrollAt: number; anchored: boolean };

export type LineAction = { label: string; href?: Href; onPress?: () => void };

export interface CompanionLine {
  id: string;
  mood: MascotMood;
  text: string;
  title?: string;
  action?: LineAction;
  /** A Highlight id to fly to. */
  target?: string;
  /** A perch id to land on. */
  perch?: string;
  priority: 'event' | 'time' | 'route';
  /** `user`: the student caused it (a tap, an answer); `system`: unsolicited. */
  source: 'user' | 'system';
  expiresAt?: number;
}

export type CompanionEvent =
  | { type: 'pomodoro.focusDone'; minutes: number; breakMinutes: number; xp: number; pomodorosToday: number }
  | { type: 'pomodoro.breakDone' }
  | { type: 'answer.verdict'; result: 'correct' | 'wrong' | 'blank'; hintsUsed: number; source: 'solve' | 'review' }
  | { type: 'review.sessionDone'; correct: number; wrong: number; remaining: number }
  | { type: 'exam.saved'; exam: 'TYT' | 'AYT'; net: number; prevNet: number | null; topSubject: string | null; weakTopic: string | null }
  | { type: 'goals.allDone' }
  | { type: 'level.up'; level: number };

export interface CompanionStore {
  phase: Phase;
  /** The perch Lumi is standing on (a CompanionPerch shows its own still Lumi otherwise). */
  occupiedPerch: string | null;
  /** In-tree Lumis mounted right now (MascotNote, EmptyState, ErrorState): one Lumi per screen. */
  yieldCount: number;
  celebrating: boolean;
  current: CompanionLine | null;
  queue: CompanionLine[];
  perches: Record<string, Rect>;
  targets: Record<string, Rect>;
  stripRect: Rect | null;
  /** The focused Screen's scroll offset. */
  activeScroll: SharedValue<number> | null;
  /** Highlight progress (0 → 1) while Lumi glides along the active target. */
  glide: SharedValue<number>;
  highlightId: string | null;
  /** Highlight persist keys drawn and still standing. */
  marked: string[];
  stageTarget: { x: number; y: number } | null;

  say(line: CompanionLine): void;
  emit(e: CompanionEvent): void;
  dismiss(): void;
  react(mood: MascotMood): void;
  snooze(untilTs: number): void;
  registerPerch(id: string, r: Rect): void;
  unregisterPerch(id: string): void;
  registerTarget(id: string, r: Rect): void;
  unregisterTarget(id: string): void;
  setStripRect(r: Rect | null): void;
  setActiveScroll(sv: SharedValue<number> | null): void;
  /** An in-tree Lumi mounted; returns its release. */
  yieldTo(): () => void;
  setCelebrating(b: boolean): void;
  /** Ask Lumi to fly to a point for a celebration; false = render your own mascot. */
  stage(p: { x: number; y: number } | null): boolean;
  /** A highlighted task is done: its mark is struck through and dropped. */
  markDone(persistKey: string): void;

  // Internals (owned by the companion package; not part of the frozen API).
  /** The last event emitted, for the companion to turn into a line. */
  lastEvent: CompanionEvent | null;
  /** A context reaction asked for (a tap), until the companion plays it. */
  reaction: MascotMood | null;
  /** No unsolicited lines or flights until this time (ms epoch). */
  snoozedUntil: number;
}

const sameRect = (a: Rect | null | undefined, b: Rect | null | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.scrollAt === b.scrollAt && a.anchored === b.anchored;

function without<T>(record: Record<string, T>, id: string): Record<string, T> {
  if (!(id in record)) return record;
  const next = { ...record };
  delete next[id];
  return next;
}

export const useCompanionStore = create<CompanionStore>((set, get) => ({
  phase: 'hidden',
  occupiedPerch: null,
  yieldCount: 0,
  celebrating: false,
  current: null,
  queue: [],
  perches: {},
  targets: {},
  stripRect: null,
  activeScroll: null,
  glide: makeMutable(0),
  highlightId: null,
  marked: [],
  stageTarget: null,
  lastEvent: null,
  reaction: null,
  snoozedUntil: 0,

  say: (line) => {
    const { current, queue } = get();
    if (current?.id === line.id || queue.some((l) => l.id === line.id)) return;
    if (!current) set({ current: line });
    else set({ queue: [...queue, line] });
  },
  emit: (e) => set({ lastEvent: e }),
  dismiss: () => {
    const now = Date.now();
    const queue = get().queue.filter((l) => !l.expiresAt || l.expiresAt > now);
    set({ current: queue[0] ?? null, queue: queue.slice(1) });
  },
  react: (mood) => set({ reaction: mood }),
  snooze: (untilTs) => set({ snoozedUntil: untilTs }),

  registerPerch: (id, r) => {
    if (sameRect(get().perches[id], r)) return;
    set({ perches: { ...get().perches, [id]: r } });
  },
  unregisterPerch: (id) => {
    const { perches, occupiedPerch } = get();
    set({ perches: without(perches, id), occupiedPerch: occupiedPerch === id ? null : occupiedPerch });
  },
  registerTarget: (id, r) => {
    if (sameRect(get().targets[id], r)) return;
    set({ targets: { ...get().targets, [id]: r } });
  },
  unregisterTarget: (id) => {
    const { targets, highlightId } = get();
    set({ targets: without(targets, id), highlightId: highlightId === id ? null : highlightId });
  },
  setStripRect: (r) => {
    const prev = get().stripRect;
    if (r === prev || sameRect(prev, r)) return;
    set({ stripRect: r });
  },
  setActiveScroll: (sv) => {
    if (get().activeScroll !== sv) set({ activeScroll: sv });
  },

  yieldTo: () => {
    set({ yieldCount: get().yieldCount + 1 });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      set({ yieldCount: Math.max(0, get().yieldCount - 1) });
    };
  },
  setCelebrating: (b) => set({ celebrating: b }),
  // Staging comes with the companion package; until then RewardBurst draws its own Lumi.
  stage: () => false,
  markDone: (persistKey) => {
    const { marked } = get();
    if (marked.includes(persistKey)) set({ marked: marked.filter((k) => k !== persistKey) });
  },
}));
