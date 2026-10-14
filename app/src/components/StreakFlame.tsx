import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { layout, useTheme } from '../theme';
import { Icon } from './Icon';
import { ease } from './motion/presets';


/** The disc size for a streak: grows at a week and at a month. */
export function flameSize(streak: number): number {
  let i = 0;
  for (let t = 0; t < layout.streakFlame.tiers.length; t++) if (streak >= layout.streakFlame.tiers[t]!) i = t;
  return layout.streakFlame.size[i]!;
}

/**
 * Streak flame in a soft disc, sized by tier (`streak`), or a fixed `size`. A live streak
 * breathes gently (static under Reduce Motion); turning on or off cross-fades.
 */
export function StreakFlame({ active, streak = 0, size: sizeProp }: { active: boolean; streak?: number; size?: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(0);
  const on = useSharedValue(active ? 1 : 0);
  const size = sizeProp ?? flameSize(streak);
  const icon = Math.round(size * (theme.layout.system.iconSize.lg / theme.layout.streakFlame.size[0]));

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, {
      duration: reduceMotion ? theme.motion.companion.rmFadeMs : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [active, reduceMotion, on, theme.motion]);

  useEffect(() => {
    if (!active || reduceMotion) {
      flicker.value = 0;
      return;
    }
    const half = theme.motion.duration.celebrate / 2;
    flicker.value = withRepeat(
      withSequence(withTiming(1, { duration: half, easing: ease('breath') }), withTiming(0, { duration: half, easing: ease('breath') })),
      -1,
    );
    return () => cancelAnimation(flicker);
  }, [active, reduceMotion, flicker, theme.motion.duration.celebrate]);

  // The flame sways around its base: the scale and turn are sandwiched between translates,
  // since iOS ignores transformOrigin on Reanimated transforms. The sway is one full sine per
  // breath, so the flame stands upright at rest (and under Reduce Motion).
  const flameStyle = useAnimatedStyle(() => {
    const base = icon / 2;
    return {
      transform: [
        { translateY: base },
        { translateY: -theme.motion.flame.rise * flicker.value },
        { scaleY: 1 + theme.motion.flame.stretch * flicker.value },
        { rotate: `${Math.sin(flicker.value * 2 * Math.PI) * theme.motion.flame.swayDeg}deg` },
        { translateY: -base },
      ],
    };
  }, [icon]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: on.value * (theme.opacity.flameGlow.low + (theme.opacity.flameGlow.high - theme.opacity.flameGlow.low) * flicker.value),
    transform: [{ scale: theme.opacity.flameGlow.scaleFrom + (1 - theme.opacity.flameGlow.scaleFrom) * flicker.value }],
  }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const glow = size * theme.layout.streakFlame.glowShare;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} aria-hidden>
      <View style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.pill, backgroundColor: theme.colors.streakSoft }]} />
      <Animated.View style={[{ position: 'absolute', width: glow, height: glow, borderRadius: theme.radius.pill, backgroundColor: theme.colors.streak }, glowStyle]} />
      <Animated.View style={flameStyle}>
        <Icon name="flame" size={icon} color={theme.colors.streak} />
        <Animated.View style={[StyleSheet.absoluteFill, filledStyle]}>
          <Icon name="flame" size={icon} color={theme.colors.streak} filled />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
