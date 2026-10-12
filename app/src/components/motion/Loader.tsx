import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const DOTS = 3;

function Dot({ phase, color, size }: { phase: SharedValue<number>; color: string; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * phase.value,
    transform: [{ translateY: -size * 0.6 * phase.value }],
  }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/** Three softly bouncing dots: the app's generic "loading" indicator. */
export function Loader({ color, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    const half = theme.motion.duration.slow;
    const bounce = () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: half, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: half, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: half }),
        ),
        -1,
      );
    if (reduceMotion) {
      a.value = b.value = c.value = 0.6;
      return;
    }
    [a, b, c].forEach((v, i) => {
      v.value = withDelay(i * (half / DOTS) * 2, bounce());
    });
  }, [a, b, c, reduceMotion, theme.motion.duration.slow]);

  const size = theme.spacing.sm;
  const tint = color ?? theme.colors.primaryText;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Yükleniyor"
      style={[{ flexDirection: 'row', gap: theme.spacing.xs, alignSelf: 'center', paddingVertical: theme.spacing.md }, style]}
    >
      {[a, b, c].map((v, i) => (
        <Dot key={i} phase={v} color={tint} size={size} />
      ))}
    </View>
  );
}
