import { useEffect, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';
import { ease } from '../motion/presets';

// TOKEN-PENDING: layout.focusVignette = { clear: 0.55, radius: '75%' } (where the edge shade starts, and the gradient's reach)
const VIGNETTE = { clear: 0.55, radius: '75%' };

/** How deep "Odak modu" is: 0 off, 0.5 paused (lifted halfway), 1 focusing. */
export type FocusLevel = 0 | 0.5 | 1;

function useLevel(level: FocusLevel) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const v = useSharedValue<number>(level);
  useEffect(() => {
    // An information-carrying fade: still a fade under Reduce Motion, only shorter.
    v.value = withTiming(level, {
      duration: reduceMotion ? theme.motion.duration.fast : theme.motion.timerFocus.dimMs,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [level, reduceMotion, v, theme.motion.duration.fast, theme.motion.timerFocus.dimMs]);
  return v;
}

/** Content that steps back while the student focuses (to `timerFocus.dim` opacity, 600 ms). */
export function FocusDim({ level, children, style }: { level: FocusLevel; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const v = useLevel(level);
  const dim = theme.motion.timerFocus.dim;
  const animated = useAnimatedStyle(() => ({ opacity: 1 - (1 - dim) * v.value }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** The focus vignette: the screen's edges shade softly while focusing. Never takes touches. */
export function FocusVignette({ level }: { level: FocusLevel }) {
  const theme = useTheme();
  const v = useLevel(level);
  const animated = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animated]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="focusVignette" cx="50%" cy="50%" r={VIGNETTE.radius} fx="50%" fy="50%">
            <Stop offset={VIGNETTE.clear} stopColor={theme.colors.focusVignette} stopOpacity={0} />
            <Stop offset={1} stopColor={theme.colors.focusVignette} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#focusVignette)" />
      </Svg>
    </Animated.View>
  );
}
