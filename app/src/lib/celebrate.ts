import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AttemptResult, Rewards } from '../api/types';
import { dockPickRect } from '../components/AnswerDock';
import { useCelebrate, type BurstRect, type Celebration } from '../components/motion/Celebration';
import { useCompanionStore } from '../store/companionStore';
import { useTheme } from '../theme';
import { haptics } from './haptics';

/** Where an answer was given: a photographed question, or a review session. */
export type VerdictSource = 'solve' | 'review';

/** What the companion hears about a verdict besides its result (defaults: no hints, the source from the route). */
export interface VerdictMeta {
  hintsUsed?: number;
  source?: VerdictSource;
}

/** Full-screen moments for what an action earned beyond its own result: level, badges, streak. */
export function rewardCelebrations(rewards: Rewards | null | undefined): Celebration[] {
  if (!rewards) return [];
  return [
    ...(rewards.levelUp ? [{ kind: 'level' as const, level: rewards.levelUp }] : []),
    ...rewards.badges.map((b) => ({ kind: 'badge' as const, badgeId: b.id })),
    ...(rewards.streak ? [{ kind: 'streak' as const, days: rewards.streak }] : []),
  ];
}

/**
 * Feedback for a marked answer, on the spot where it happened: a right answer puffs soft
 * highlighter strokes and its XP out of the answer row (or `at`; with the choices collapsed,
 * the letter she coded in the dock), a wrong one gets a warning tap and no scrim (the red pen
 * circles it), a blank one a soft tick. The companion hears `answer.verdict`. Then any new
 * level, badge and streak play full screen.
 */
export function useResultCelebration() {
  const { celebrate, burst } = useCelebrate();
  const fallback = useFallbackSpot();
  const pathname = usePathname();
  const routeSource: VerdictSource = pathname.startsWith('/review') ? 'review' : 'solve';
  return useCallback(
    (result: AttemptResult, rewards: Rewards, at?: BurstRect | null, meta?: VerdictMeta) => {
      const extra = rewardCelebrations(rewards);
      if (result === 'correct') {
        haptics.success();
        burst(at ?? dockPickRect() ?? fallback(), rewards.xpGained || undefined);
      } else if (result === 'wrong') {
        haptics.warning();
      } else {
        haptics.select();
      }
      useCompanionStore.getState().emit({
        type: 'answer.verdict',
        result,
        hintsUsed: meta?.hintsUsed ?? 0,
        source: meta?.source ?? routeSource,
      });
      if (extra.length) celebrate(...extra);
    },
    [burst, celebrate, fallback, routeSource],
  );
}

/** Just above the answer dock, centered: where a burst comes from when no row or letter reported one. */
function useFallbackSpot() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return useCallback(() => {
    const w = Math.min(width - theme.spacing.xl * 2, theme.layout.readableWidth);
    const y = height - insets.bottom - theme.layout.dock.height - theme.spacing.xl;
    return { x: (width - w) / 2, y, width: w, height: theme.layout.minTouch };
  }, [width, height, insets.bottom, theme]);
}

/**
 * Times an answer's verdict: the picked letter "seals" for a short beat (with two light
 * ticks) before the server's verdict shows, even when the server is instant, and the
 * celebration launches from the row the page reports once it turns graded (or from the
 * dock's letter when the choices are collapsed).
 *
 * `begin()` starts the beat; `finish(result, rewards, show, opts)` calls `show()` once the
 * beat is over (switch the UI to graded there); `onVerdict(rect)` is the MathView callback.
 * `opts.hintsUsed` and `opts.source` are passed on to the companion (optional).
 */
export function useVerdict() {
  const theme = useTheme();
  const celebrateResult = useResultCelebration();
  const started = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pending = useRef<{ result: AttemptResult; rewards: Rewards; meta: VerdictMeta } | null>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const begin = useCallback(() => {
    clear();
    started.current = Date.now();
    timers.current = theme.motion.verdict.drumroll.map((ms) => setTimeout(() => haptics.select(), ms));
  }, [theme.motion.verdict.drumroll]);

  const fire = useCallback(
    (at?: BurstRect | null) => {
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      celebrateResult(p.result, p.rewards, at, p.meta);
    },
    [celebrateResult],
  );

  const finish = useCallback(
    (result: AttemptResult, rewards: Rewards, show: () => void, opts: { fromRow: boolean } & VerdictMeta) => {
      const wait = Math.max(0, theme.motion.verdict.dwell - (Date.now() - started.current));
      const t = setTimeout(() => {
        pending.current = { result, rewards, meta: { hintsUsed: opts.hintsUsed, source: opts.source } };
        show();
        // The page reports the graded row; without one (self-marked answers, collapsed
        // choices, or the page never answers), celebrate from the dock.
        if (!opts.fromRow) fire(null);
        else timers.current.push(setTimeout(() => fire(null), theme.motion.duration.slow));
      }, wait);
      timers.current.push(t);
    },
    [fire, theme.motion.verdict.dwell, theme.motion.duration.slow],
  );

  const cancel = useCallback(() => {
    clear();
    pending.current = null;
  }, []);

  return { begin, finish, cancel, onVerdict: useCallback((rect: BurstRect) => fire(rect), [fire]) };
}

/**
 * For actions without an answer row (a pomodoro, a deneme): level up, badges, streak.
 * Each moment plays its own haptic as it stamps (RewardBurst).
 */
export function useRewardCelebration() {
  const { celebrate } = useCelebrate();
  return useCallback(
    (rewards: Rewards | null | undefined) => {
      const items = rewardCelebrations(rewards);
      if (items.length) celebrate(...items);
    },
    [celebrate],
  );
}
