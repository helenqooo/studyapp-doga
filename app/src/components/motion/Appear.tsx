import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../theme';

interface Props {
  children: ReactNode;
  /** Position in a list; each step delays the entrance by `motion.stagger`. */
  index?: number;
  /** Fade only, without the upward drift (for large blocks). */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fades its children in with a short upward drift when first mounted. Layout
 * animations follow the system "Reduce Motion" setting by default.
 */
export function Appear({ children, index = 0, still = false, style }: Props) {
  const theme = useTheme();
  const { duration, stagger, rise } = theme.motion;
  const delay = Math.min(index, 10) * stagger;
  // On web, custom keyframes get pinned in place (position: absolute) after they finish,
  // so the browser preview uses the stock preset.
  const entering = still
    ? FadeIn.duration(duration.slow).delay(delay)
    : Platform.OS === 'web'
      ? FadeInDown.duration(duration.slow).delay(delay)
      : FadeInDown.duration(duration.slow)
          .delay(delay)
          .withInitialValues({ opacity: 0, transform: [{ translateY: rise }] });
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
