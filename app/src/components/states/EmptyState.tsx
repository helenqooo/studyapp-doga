import type { ReactNode } from 'react';
import Animated, { ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { Card } from '../Card';
import { MascotNote } from '../mascot/MascotNote';
import type { MascotMood } from '../mascot/Mascot';
import { enter } from '../motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;

/**
 * The cross-fade a state card arrives with (it usually replaces a skeleton): 220 ms, or a
 * 120 ms fade under Reduce Motion, never a hard cut.
 */
export function useStateFade() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  return enter({ still: true, duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base }).reduceMotion(ReduceMotion.Never);
}

/** Nothing here yet: Lumi says what this place is for and points to the first step. */
export function EmptyState({ mood = 'wave', title, children, action }: { mood?: MascotMood; title: string; children?: ReactNode; action?: ReactNode }) {
  const fade = useStateFade();
  return (
    <Animated.View entering={fade}>
      <Card variant="sheet">
        <MascotNote mood={mood} title={title} action={action}>
          {children}
        </MascotNote>
      </Card>
    </Animated.View>
  );
}
