import { useEffect, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { AppText } from './AppText';

// Damla, the assistant: a small clay drop ("damlaya damlaya göl olur"). Image made with an
// image model, background cut out; see assets/brand/.
const SOURCE = require('../../assets/brand/damla.png');

/** Damla, gently bobbing (`still`, or reduced motion: no motion). Decorative: say things in text. */
export function Damla({ size, still = false }: { size?: number; still?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() || still;
  const s = size ?? theme.layout.mascot.note;
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = theme.motion.duration.celebrate;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [bob, reduceMotion, theme.motion.duration.celebrate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -s * 0.04 * bob.value }, { scaleY: 1 - 0.02 * bob.value }, { scaleX: 1 + 0.01 * bob.value }],
  }));

  return (
    <Animated.View style={[{ width: s, height: s }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={SOURCE} style={{ width: s, height: s }} resizeMode="contain" />
    </Animated.View>
  );
}

/** Damla with a short line next to it: greetings, empty states, gentle nudges. */
export function DamlaNote({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Damla />
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <AppText weight="semibold">{title}</AppText>
        {typeof children === 'string' ? <AppText color="textMuted">{children}</AppText> : children}
        {action ? <View style={{ marginTop: theme.spacing.xs, alignSelf: 'flex-start' }}>{action}</View> : null}
      </View>
    </View>
  );
}
