import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { cancelTimerNotification, scheduleTimerNotification } from '../lib/timerNotifications';

// Pomodoro timer. Times are wall-clock timestamps, so the countdown stays right while the
// app is in the background or closed; a local notification marks the end.

export type TimerPhase = 'idle' | 'focus' | 'break';

/** A phase that just ended, ready to be saved as a session. */
export interface FinishedPhase {
  id: string;
  kind: 'focus' | 'break';
  subject: string | null;
  startedAt: number;
  endedAt: number;
  completed: boolean;
}

interface PersistedTimer {
  phase: TimerPhase;
  subject: string | null;
  sessionId: string | null;
  /** When the current phase started (first start, not the last resume). */
  phaseStartedAt: number | null;
  /** Planned end while running; null while paused. */
  endsAt: number | null;
  /** Time left when paused. */
  pausedRemainingMs: number | null;
  /** Running time accumulated before the last resume. */
  activeMsBeforeResume: number;
  /** When the timer last started or resumed. */
  resumedAt: number | null;
  plannedMs: number;
  notificationId: string | null;
}

interface TimerState extends PersistedTimer {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: (kind: 'focus' | 'break', minutes: number, subject: string | null) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Ends the phase now (stopped early or finished) and returns it for saving. */
  finish: (completed: boolean) => Promise<FinishedPhase | null>;
  setSubject: (subject: string | null) => void;
}

const KEY = 'derece.timer';
const IDLE: PersistedTimer = {
  phase: 'idle',
  subject: null,
  sessionId: null,
  phaseStartedAt: null,
  endsAt: null,
  pausedRemainingMs: null,
  activeMsBeforeResume: 0,
  resumedAt: null,
  plannedMs: 0,
  notificationId: null,
};

function persist(state: PersistedTimer) {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

const pick = (s: TimerState): PersistedTimer => ({
  phase: s.phase,
  subject: s.subject,
  sessionId: s.sessionId,
  phaseStartedAt: s.phaseStartedAt,
  endsAt: s.endsAt,
  pausedRemainingMs: s.pausedRemainingMs,
  activeMsBeforeResume: s.activeMsBeforeResume,
  resumedAt: s.resumedAt,
  plannedMs: s.plannedMs,
  notificationId: s.notificationId,
});

export const useTimerStore = create<TimerState>((set, get) => {
  const update = (patch: Partial<PersistedTimer>) => {
    set(patch);
    persist(pick(get()));
  };

  return {
    ...IDLE,
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        set({ ...(raw ? (JSON.parse(raw) as PersistedTimer) : IDLE), hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    start: async (kind, minutes, subject) => {
      await cancelTimerNotification(get().notificationId);
      const now = Date.now();
      const plannedMs = minutes * 60_000;
      const endsAt = now + plannedMs;
      update({
        phase: kind,
        subject: kind === 'focus' ? subject : get().subject,
        sessionId: Crypto.randomUUID(),
        phaseStartedAt: now,
        endsAt,
        pausedRemainingMs: null,
        activeMsBeforeResume: 0,
        resumedAt: now,
        plannedMs,
        notificationId: null,
      });
      const notificationId = await scheduleTimerNotification(kind, endsAt, minutes);
      update({ notificationId });
    },

    pause: async () => {
      const s = get();
      if (s.phase === 'idle' || s.endsAt === null || s.resumedAt === null) return;
      const now = Date.now();
      await cancelTimerNotification(s.notificationId);
      update({
        pausedRemainingMs: Math.max(0, s.endsAt - now),
        activeMsBeforeResume: s.activeMsBeforeResume + (now - s.resumedAt),
        endsAt: null,
        resumedAt: null,
        notificationId: null,
      });
    },

    resume: async () => {
      const s = get();
      if (s.phase === 'idle' || s.pausedRemainingMs === null) return;
      const now = Date.now();
      const endsAt = now + s.pausedRemainingMs;
      update({ endsAt, resumedAt: now, pausedRemainingMs: null });
      const notificationId = await scheduleTimerNotification(s.phase, endsAt, Math.round(s.plannedMs / 60_000));
      update({ notificationId });
    },

    finish: async (completed) => {
      const s = get();
      if (s.phase === 'idle' || !s.sessionId || s.phaseStartedAt === null) return null;
      const now = Date.now();
      // A phase that ran out is closed at its planned end, not when the app noticed.
      const endedAt = completed && s.endsAt !== null ? Math.min(now, s.endsAt) : now;
      const activeMs = s.activeMsBeforeResume + (s.resumedAt !== null ? endedAt - s.resumedAt : 0);
      await cancelTimerNotification(s.notificationId);
      const finished: FinishedPhase = {
        id: s.sessionId,
        kind: s.phase,
        subject: s.phase === 'focus' ? s.subject : null,
        // Paused time doesn't count: the session spans only the running time.
        startedAt: endedAt - Math.max(1000, activeMs),
        endedAt,
        completed,
      };
      update({ ...IDLE, subject: s.subject });
      return finished;
    },

    setSubject: (subject) => update({ subject }),
  };
});

/** Milliseconds left in the current phase. */
export function remainingMs(s: Pick<PersistedTimer, 'phase' | 'endsAt' | 'pausedRemainingMs'>, now = Date.now()): number {
  if (s.phase === 'idle') return 0;
  if (s.pausedRemainingMs !== null) return s.pausedRemainingMs;
  return s.endsAt === null ? 0 : Math.max(0, s.endsAt - now);
}
