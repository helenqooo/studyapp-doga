import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { ease } from './motion/presets';


interface Props {
  /** 0..1 */
  progress: number;
  /** Raw color token values; default to the XP colors. */
  color?: string;
  trackColor?: string;
  height?: number;
  /** Value (0..1) to animate from on mount; default empty. */
  from?: number;
  /**
   * `groove` (default): the XP groove, a fill that also wraps with a soft shine when the value
   * goes down (a level up). `plain`: the same bar without the wrap (the value just glides back).
   */
  variant?: 'groove' | 'plain';
  style?: StyleProp<ViewStyle>;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Bar that fills from `from` on mount and tweens to every new value with scaleX (720 ms,
 * standard), scaled from its left edge with the translate sandwich (iOS ignores
 * transformOrigin on Reanimated transforms). Reduce Motion jumps, with a short flash on a wrap.
 */
export function ProgressBar({ progress, color, trackColor, height, from, variant = 'groove', style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const h = height ?? theme.layout.progressHeight;
  const target = clamp(progress);
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(from === undefined ? 0 : clamp(from));
  const shine = useSharedValue(0);
  const flash = useSharedValue(0);
  const last = useRef<number>(from === undefined ? 0 : clamp(from));

  useEffect(() => {
    const prev = last.current;
    last.current = target;
    const { fill: fillMs, shine: shineMs } = theme.motion.progress;
    const tween = { duration: fillMs, easing: ease('standard') };
    const wrap = variant === 'groove' && target < prev;
    if (reduceMotion) {
      fill.value = target;
      if (wrap) {
        flash.value = withSequence(
          withTiming(1, { duration: theme.motion.progress.rmFlash / 2, reduceMotion: ReduceMotion.Never }),
          withTiming(0, { duration: theme.motion.progress.rmFlash / 2, reduceMotion: ReduceMotion.Never }),
        );
      }
      return;
    }
    if (!wrap) {
      fill.value = withTiming(target, tween);
      return;
    }
    // A level up: fill to the end, sweep the shine, then start over from empty.
    const toEnd = { duration: fillMs * (1 - fill.value), easing: ease('standard') };
    fill.value = withSequence(withTiming(1, toEnd), withDelay(shineMs, withTiming(0, { duration: 0 })), withTiming(target, tween));
    shine.value = 0;
    shine.value = withDelay(toEnd.duration, withTiming(1, { duration: shineMs, easing: ease('standard') }));
  }, [target, variant, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const half = width / 2;
  const fillStyle = useAnimatedStyle(() => ({
    // The translate sandwich: scale around the left edge.
    transform: [{ translateX: -half }, { scaleX: fill.value }, { translateX: half }],
  }));
  const bandW = width * theme.layout.progress.shineShare;
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? theme.opacity.shine : 0,
    transform: [{ translateX: -bandW + (width + bandW) * shine.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * theme.opacity.shine }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const white = theme.colors.textOnAccent;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      onLayout={onLayout}
      style={[
        { height: h, borderRadius: theme.radius.pill, backgroundColor: trackColor ?? theme.colors.xpTrack, overflow: 'hidden' },
        style,
      ]}
    >
      {width > 0 ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color ?? theme.colors.xp, borderRadius: theme.radius.pill }, fillStyle]} />
          {variant === 'groove' ? (
            <>
              <Animated.View pointerEvents="none" style={[styles.band, { width: bandW, backgroundColor: white, borderRadius: theme.radius.pill }, shineStyle]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: white }, flashStyle]} />
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
