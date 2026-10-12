import { useEffect } from 'react';
import { View } from 'react-native';
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
import { Icon } from './Icon';

/** Streak flame in a soft disc; it flickers gently while a streak is alive. */
export function StreakFlame({ active }: { active: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(0);
  const size = theme.layout.minTouch + theme.spacing.lg;

  useEffect(() => {
    if (!active || reduceMotion) {
      flicker.value = 0;
      return;
    }
    const half = theme.motion.duration.celebrate / 2;
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [active, reduceMotion, flicker, theme.motion.duration.celebrate]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * flicker.value }, { scaleY: 1 + 0.08 * flicker.value }, { rotate: `${(flicker.value - 0.5) * 4}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + 0.18 * flicker.value,
    transform: [{ scale: 0.8 + 0.2 * flicker.value }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.streakSoft }} />
      {active ? (
        <Animated.View
          style={[
            { position: 'absolute', width: size * 0.78, height: size * 0.78, borderRadius: size, backgroundColor: theme.colors.streak },
            glowStyle,
          ]}
        />
      ) : null}
      <Animated.View style={flameStyle}>
        <Icon
          name="flame"
          size={theme.layout.iconSize.lg}
          color={theme.colors.streak}
          filled={active}
        />
      </Animated.View>
    </View>
  );
}
