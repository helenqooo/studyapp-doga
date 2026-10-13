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
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { ease } from './motion/presets';

// TOKEN-PENDING: layout.streakFlame = { tiers: [1, 7, 30], size: [44, 52, 60], glowShare: 0.78 } (flame disc by streak tier, spec 7.1 Seri)
const FLAME = { tiers: [1, 7, 30], size: [44, 52, 60], glowShare: 0.78 } as const;
// TOKEN-PENDING: opacity.flameGlow = { low: 0.12, high: 0.3, scaleFrom: 0.8 } (the breathing glow behind a live flame)
const GLOW = { low: 0.12, high: 0.3, scaleFrom: 0.8 } as const;
// TOKEN-PENDING: motion.flame = { rise: 1.5, stretch: 0.08, swayDeg: 2 } (the live flame's breath: lift in pt, scaleY gain, sway each way)
const BREATH = { rise: 1.5, stretch: 0.08, swayDeg: 2 } as const;

/** The disc size for a streak: grows at a week and at a month. */
export function flameSize(streak: number): number {
  let i = 0;
  for (let t = 0; t < FLAME.tiers.length; t++) if (streak >= FLAME.tiers[t]!) i = t;
  return FLAME.size[i]!;
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
  const icon = Math.round(size * (theme.layout.system.iconSize.lg / FLAME.size[0]));

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
        { translateY: -BREATH.rise * flicker.value },
        { scaleY: 1 + BREATH.stretch * flicker.value },
        { rotate: `${Math.sin(flicker.value * 2 * Math.PI) * BREATH.swayDeg}deg` },
        { translateY: -base },
      ],
    };
  }, [icon]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: on.value * (GLOW.low + (GLOW.high - GLOW.low) * flicker.value),
    transform: [{ scale: GLOW.scaleFrom + (1 - GLOW.scaleFrom) * flicker.value }],
  }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const glow = size * FLAME.glowShare;

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
