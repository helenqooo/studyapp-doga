import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../theme';

// Three strokes crossing at 60° make a plain typographic asterisk.
const STROKES = 3;

/**
 * Slowly turning, breathing asterisk shown while the AI reads or writes
 * (solving a question, reading a karne, answering in chat).
 */
export function ThinkingSpark({ size, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const s = size ?? theme.layout.spark;
  const spin = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(1, { duration: theme.motion.duration.celebrate * 4, easing: Easing.linear }), -1);
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: theme.motion.duration.celebrate / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: theme.motion.duration.celebrate / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [breath, spin, reduceMotion, theme.motion.duration.celebrate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.86 + 0.14 * breath.value }],
    opacity: 0.75 + 0.25 * breath.value,
  }));

  const c = s / 2;
  const r = s * 0.42;
  return (
    <Animated.View style={[{ width: s, height: s, alignSelf: 'center' }, style]} accessibilityLabel="Düşünüyor">
      <Svg width={s} height={s}>
        {Array.from({ length: STROKES }, (_, i) => {
          const a = (i * Math.PI) / STROKES + Math.PI / 2;
          const dx = Math.cos(a) * r;
          const dy = Math.sin(a) * r;
          return (
            <Line
              key={i}
              x1={c - dx}
              y1={c - dy}
              x2={c + dx}
              y2={c + dy}
              stroke={color ?? theme.colors.accent}
              strokeWidth={s * 0.11}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}
