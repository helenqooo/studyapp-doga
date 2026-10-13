import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { ease, spring } from './presets';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Press feedback by what the control is (design spec 5.1):
 * - `button`: sinks (scale 0.96) and nudges down 1 pt.
 * - `card`: a barely-there sink (0.985) with a slight fade.
 * - `bubble`: tabs, chips, segments, A–E letters, goal rows, steppers: a firm 0.9 squeeze.
 * - `row`: list rows: no scale, a `primarySoft` tint fades in behind the content.
 */
export type PressKind = 'button' | 'card' | 'bubble' | 'row';

/** A haptic fired on press-in (most callers fire their own in onPress instead). */
export type PressHaptic = 'tap' | 'select' | 'grain' | 'press' | 'rigid';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Press feedback per control type; defaults to `button`. */
  kind?: PressKind;
  /** Scale while pressed; overrides the kind's scale. */
  scaleTo?: number;
  /**
   * Shows the control as unavailable (disabled opacity). Set by the caller rather than
   * derived from `disabled`, since non-interactive tiles are disabled but not dimmed.
   */
  dimmed?: boolean;
  /**
   * A tint that fades in behind the content while pressed (a raw token value). Defaults to
   * `primarySoft` for `row`; other kinds have none unless given (e.g. a secondary button).
   */
  pressedBg?: string;
  /** Fires this haptic on press-in. Off by default: most callers fire theirs in onPress. */
  haptic?: PressHaptic;
}

/**
 * Pressable that answers the finger by kind: a sink, a squeeze or a tint, sprung back with
 * `springs.press`. Under Reduce Motion every kind fades to 0.72 opacity instead (rows keep
 * their tint, which is not motion).
 */
export function PressableScale({
  children,
  style,
  kind = 'button',
  scaleTo,
  dimmed = false,
  pressedBg,
  haptic,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { press, duration } = theme.motion;
  const pressed = useSharedValue(0);
  const tint = useSharedValue(0);

  const scale = reduceMotion ? 1 : (scaleTo ?? press[kind]);
  const nudge = !reduceMotion && kind === 'button' ? press.nudgeY : 0;
  // Full motion: only cards fade. Reduce Motion: everything but rows fades instead of moving.
  const fade = reduceMotion ? (kind === 'row' ? 0 : 1 - press.rmOpacity) : kind === 'card' ? press.fade : 0;
  // The animated style owns opacity (it comes last), so the dimmed state lives here too.
  const restOpacity = dimmed ? theme.opacity.disabled : 1;
  const bg = pressedBg ?? (kind === 'row' ? theme.colors.primarySoft : undefined);

  const animatedStyle = useAnimatedStyle(() => {
    // Springs overshoot a little; the fade must not.
    const p = Math.min(1, Math.max(0, pressed.value));
    return {
      transform: [{ translateY: nudge * pressed.value }, { scale: 1 - (1 - scale) * pressed.value }],
      opacity: restOpacity * (1 - fade * p),
    };
  }, [scale, nudge, fade, restOpacity]);

  const tintStyle = useAnimatedStyle(() => ({ opacity: tint.value }));

  // The tint follows the control's own corner shape.
  const flat = bg ? StyleSheet.flatten(style) : undefined;
  const corners = flat
    ? {
        borderRadius: flat.borderRadius,
        borderTopLeftRadius: flat.borderTopLeftRadius,
        borderTopRightRadius: flat.borderTopRightRadius,
        borderBottomLeftRadius: flat.borderBottomLeftRadius,
        borderBottomRightRadius: flat.borderBottomRightRadius,
        borderCurve: flat.borderCurve,
      }
    : null;

  const fadeTo = (to: number, ms: number) =>
    withTiming(to, { duration: ms, easing: ease('standard'), reduceMotion: ReduceMotion.Never });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = reduceMotion ? fadeTo(1, duration.instant) : withSpring(1, spring('press'));
        if (bg) tint.value = fadeTo(1, duration.fast);
        if (haptic) haptics[haptic]();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduceMotion ? fadeTo(0, duration.instant) : withSpring(0, spring('press'));
        if (bg) tint.value = fadeTo(0, duration.base);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {bg ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, corners, { backgroundColor: bg }, tintStyle]} />
      ) : null}
      {children}
    </AnimatedPressable>
  );
}
