import { useEffect } from 'react';
import { Easing, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';

/** 0 → 1 progress for a chart mark that draws itself in on mount (instantly with Reduce Motion). */
export function useDrawIn(delay = 0) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: theme.motion.duration.slow * 2.5, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [delay, progress, reduceMotion, theme.motion.duration.slow]);
  return progress;
}

/** Length of a polyline, used to dash a path so it can be drawn progressively. */
export function polylineLength(points: { x: number; y: number }[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  return total;
}
