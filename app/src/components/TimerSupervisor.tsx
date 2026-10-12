import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '../api/errors';
import { useProfile, useSaveSession } from '../api/hooks';
import { useRewardCelebration } from '../lib/celebrate';
import { haptics } from '../lib/haptics';
import { readOutbox, writeOutbox } from '../store/sessionOutbox';
import { remainingMs, useTimerStore, type FinishedPhase } from '../store/timerStore';

const DEFAULT_SETTINGS = { focusMinutes: 25, breakMinutes: 5 };

/**
 * Lives at the root while signed in: ends a phase when its time is up (also right after the
 * app returns from the background), saves it, celebrates and starts the break.
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

  /** Saves finished phases, keeping the ones that couldn't reach the server. */
  const flush = useCallback(
    async (extra?: FinishedPhase) => {
      const items = [...(await readOutbox()), ...(extra ? [extra] : [])];
      const left: FinishedPhase[] = [];
      for (const item of items) {
        try {
          const res = await save.mutateAsync(item);
          if (item === extra) celebrate(res.rewards);
        } catch (e) {
          // A rejected session (400) won't succeed later; anything else is retried.
          if (!(e instanceof ApiError && e.status && e.status >= 400 && e.status < 500)) left.push(item);
        }
      }
      await writeOutbox(left);
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
      if (done.kind === 'focus') await useTimerStore.getState().start('break', settings.breakMinutes, done.subject);
      await flush(done);
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
      await writeOutbox([...(await readOutbox()), done]);
    }
  }, [save]);
}
