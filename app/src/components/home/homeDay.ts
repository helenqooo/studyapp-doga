import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { localToday } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

// Home's once-a-day moments, per user: the countdown's focus pull and the "all goals done"
// check (with its haptic and the goals.allDone event). Kept at `derece.home.<userId>`.

export interface HomeDay {
  day: string;
  /** The YKS countdown has focus-pulled today. */
  pulled: boolean;
  /** Today's optik was completed and celebrated. */
  allDone: boolean;
}

const storageKey = (userId: string) => `derece.home.${userId}`;
const fresh = (day: string): HomeDay => ({ day, pulled: false, allDone: false });

/** This session's copy per user+day, and the one read in flight, so every reader agrees. */
const cache = new Map<string, HomeDay>();
const loads = new Map<string, Promise<HomeDay>>();

function load(userId: string, day: string): Promise<HomeDay> {
  const key = `${userId}:${day}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let pending = loads.get(key);
  if (!pending) {
    pending = AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        const v = raw ? (JSON.parse(raw) as Partial<HomeDay>) : null;
        return v && v.day === day ? { day, pulled: !!v.pulled, allDone: !!v.allDone } : fresh(day);
      })
      .catch(() => fresh(day))
      .then((d) => {
        // A write that landed while reading wins.
        const now = cache.get(key) ?? d;
        cache.set(key, now);
        return now;
      });
    loads.set(key, pending);
  }
  return pending;
}

/** Today's flags for the signed-in user; `ready` once read (writes merge and persist). */
export function useHomeDay() {
  const userId = useAuthStore((s) => s.user?.id) ?? 'anon';
  const day = localToday();
  const key = `${userId}:${day}`;
  // Tagged with its user+day key, so a sign-in switch never reads the previous user's flags.
  const [held, setHeld] = useState<{ key: string; value: HomeDay } | null>(() => {
    const hit = cache.get(key);
    return hit ? { key, value: hit } : null;
  });

  useEffect(() => {
    let alive = true;
    load(userId, day).then((d) => alive && setHeld({ key: `${userId}:${day}`, value: d }));
    return () => {
      alive = false;
    };
  }, [userId, day]);

  const update = useCallback(
    (patch: Partial<Omit<HomeDay, 'day'>>) => {
      const next = { ...(cache.get(key) ?? fresh(day)), ...patch };
      cache.set(key, next);
      setHeld({ key, value: next });
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => {});
    },
    [key, day, userId],
  );

  const state = held && held.key === key ? held.value : null;
  return { ready: state !== null, pulled: state?.pulled ?? false, allDone: state?.allDone ?? false, update };
}
