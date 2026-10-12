import { useCallback } from 'react';
import type { AttemptResult, Rewards } from '../api/types';
import { useCelebrate, type Celebration } from '../components/motion/Celebration';
import { haptics } from './haptics';

/** Celebrations for what an action earned beyond its own result: badges, then the streak. */
export function rewardCelebrations(rewards: Rewards | null | undefined): Celebration[] {
  if (!rewards) return [];
  return [
    ...rewards.badges.map((b) => ({ kind: 'badge' as const, badgeId: b.id })),
    ...(rewards.streak ? [{ kind: 'streak' as const, days: rewards.streak }] : []),
  ];
}

/**
 * Plays the result burst for a marked answer (with XP and any level-up), followed by any
 * new badge and streak growth.
 */
export function useResultCelebration() {
  const celebrate = useCelebrate();
  return useCallback(
    (result: AttemptResult, rewards: Rewards) => {
      const extra = rewardCelebrations(rewards);
      if (result === 'correct' || rewards.levelUp || extra.length) haptics.success();
      else if (result === 'wrong') haptics.warning();
      else haptics.select();
      celebrate({ kind: result, xp: rewards.xpGained || undefined, levelUp: rewards.levelUp }, ...extra);
    },
    [celebrate],
  );
}

/** For actions without a result burst (a pomodoro, a deneme): level up, badges, streak. */
export function useRewardCelebration() {
  const celebrate = useCelebrate();
  return useCallback(
    (rewards: Rewards | null | undefined) => {
      if (!rewards) return;
      const items: Celebration[] = rewardCelebrations(rewards);
      if (rewards.levelUp) items.unshift({ kind: 'correct', xp: rewards.xpGained || undefined, levelUp: rewards.levelUp });
      if (!items.length) return;
      haptics.success();
      celebrate(...items);
    },
    [celebrate],
  );
}
