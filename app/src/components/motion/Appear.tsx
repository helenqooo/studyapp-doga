import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { enter } from './presets';

interface Props {
  children: ReactNode;
  /** Position in a list; each step delays the entrance by `motion.stagger` (at most `motion.staggerMax` steps). */
  index?: number;
  /** Fade only, without the upward drift (for large blocks). */
  still?: boolean;
  /** Extra delay before the entrance (ms). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Content that arrives because of an action (a hint, a verdict, a solution, a grid that
 * replaced its skeleton): a fade with an 8 pt rise on the enter easing. Screens don't wrap
 * their sections in it on mount (design spec 5.3). Layout animations follow the system
 * "Reduce Motion" setting; on web the stock preset is used (see presets.enter).
 */
export function Appear({ children, index = 0, still = false, delay = 0, style }: Props) {
  return (
    <Animated.View entering={enter({ index, still, delay })} style={style}>
      {children}
    </Animated.View>
  );
}
