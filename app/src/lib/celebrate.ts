import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../api/hooks';
import type { AttemptResult, Profile } from '../api/types';
import { useCelebrate } from '../components/motion/Celebration';
import { haptics } from './haptics';

/**
 * Call before saving a result; the returned function plays the result burst (with
 * the earned XP and any level-up) once the server answers.
 */
export function useResultCelebration() {
  const celebrate = useCelebrate();
  const queryClient = useQueryClient();
  return useCallback(() => {
    const levelBefore = queryClient.getQueryData<Profile>(queryKeys.profile)?.level;
    return (result: AttemptResult, res: { xpGained: number; profile: Profile }) => {
      const levelUp = levelBefore != null && res.profile.level > levelBefore ? res.profile.level : null;
      if (result === 'correct' || levelUp) haptics.success();
      else if (result === 'wrong') haptics.warning();
      else haptics.select();
      celebrate({ kind: result, xp: res.xpGained || undefined, levelUp });
    };
  }, [celebrate, queryClient]);
}
