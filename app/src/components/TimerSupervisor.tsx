import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '../api/errors';
import { useProfile, useSaveSession, useStudyDay } from '../api/hooks';
import type { Rewards } from '../api/types';
import { useRewardCelebration } from '../lib/celebrate';
import { haptics } from '../lib/haptics';
import { useAuthStore } from '../store/authStore';
import { useCompanionStore } from '../store/companionStore';
import { addToOutbox, readOutbox, writeOutbox } from '../store/sessionOutbox';
import { remainingMs, useTimerStore, type FinishedPhase } from '../store/timerStore';

const DEFAULT_SETTINGS = { focusMinutes: 25, breakMinutes: 5 };
const MINUTE_MS = 60_000;

/**
 * Lives at the root while signed in: ends a phase when its time is up (also right after the
 * app returns from the background), saves it, celebrates and starts the break. Lumi hears
 * about it through the companion's `pomodoro.*` events.
 */
export function TimerSupervisor() {
  const hydrate = useTimerStore((s) => s.hydrate);
  const phase = useTimerStore((s) => s.phase);
  const endsAt = useTimerStore((s) => s.endsAt);
  const profile = useProfile();
  const save = useSaveSession();
  const celebrate = useRewardCelebration();
  const busy = useRef(false);
  const settings = profile.data?.settings ?? DEFAULT_SETTINGS;
  // Today's finished pomodoros before this one (the saved day refetches a moment later).
  const pomodoros = useStudyDay().data?.pomodoros ?? 0;
  const pomodorosRef = useRef(pomodoros);
  pomodorosRef.current = pomodoros;

  /** Saves finished phases, keeping the ones that couldn't reach the server; returns `extra`'s rewards. */
  const flush = useCallback(
    async (extra?: FinishedPhase): Promise<Rewards | null> => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return null;
      const items = [...(await readOutbox(userId)), ...(extra ? [extra] : [])];
      const left: FinishedPhase[] = [];
      let rewards: Rewards | null = null;
      for (const item of items) {
        try {
          const res = await save.mutateAsync(item);
          if (item === extra) {
            rewards = res.rewards;
            celebrate(res.rewards);
          }
        } catch (e) {
          // A rejected session (400) won't succeed later; anything else is retried, including
          // a 401: the sign-in ran out, and the session waits for this account's next sign-in.
          const rejected = e instanceof ApiError && !!e.status && e.status >= 400 && e.status < 500 && e.status !== 401;
          if (!rejected) left.push(item);
        }
      }
      await writeOutbox(userId, left);
      return rewards;
    },
    [save, celebrate],
  );

  const check = useCallback(async () => {
    const s = useTimerStore.getState();
    if (busy.current || s.phase === 'idle' || s.endsAt === null || remainingMs(s) > 0) return;
    busy.current = true;
    try {
      const done = await s.finish(true);
      if (!done) return;
      haptics.success();
      const before = pomodorosRef.current;
      if (done.kind === 'focus') await useTimerStore.getState().start('break', settings.breakMinutes, done.subject);
      const rewards = await flush(done);
      const companion = useCompanionStore.getState();
      if (done.kind === 'focus') {
        companion.emit({
          type: 'pomodoro.focusDone',
          minutes: Math.max(1, Math.round((done.endedAt - done.startedAt) / MINUTE_MS)),
          breakMinutes: settings.breakMinutes,
          xp: rewards?.xpGained ?? 0,
          pomodorosToday: before + 1,
        });
      } else companion.emit({ type: 'pomodoro.breakDone' });
    } finally {
      busy.current = false;
    }
  }, [flush, settings.breakMinutes]);

  useEffect(() => {
    hydrate().then(() => flush());
    // Once per sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'idle' || endsAt === null) return;
    const id = setInterval(check, 1000);
    check();
    return () => clearInterval(id);
  }, [phase, endsAt, check]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return null;
}

/** Stops the running phase early (saved as not completed) or skips the break. */
export function useStopTimer() {
  const save = useSaveSession();
  return useCallback(async () => {
    const done = await useTimerStore.getState().finish(false);
    if (!done) return;
    try {
      await save.mutateAsync(done);
    } catch {
      const userId = useAuthStore.getState().user?.id;
      if (userId) await addToOutbox(userId, done);
    }
  }, [save]);
}
