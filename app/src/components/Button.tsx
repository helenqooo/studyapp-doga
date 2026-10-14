import { useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme, type Theme } from '../theme';
import { HighlightBand } from './Highlight';
import { Icon, type IconName } from './Icon';
import { FadeText } from './motion/FadeText';
import { Loader } from './motion/Loader';
import { PressableScale } from './motion/PressableScale';
import { ease } from './motion/presets';


export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Heights 44 / 52 / 60 on a phone, 48 / 56 / 64 on a tablet. Default `md`. */
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Visually marks a chosen option in a group (e.g. the selected result). */
  selected?: boolean;
  /** Shown after the label (e.g. hint pips). */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface Look {
  bg: string;
  fg: string;
  border: string;
  pressedBg?: string;
}

function variantLook(theme: Theme, variant: ButtonVariant, selected: boolean): Look {
  const c = theme.colors;
  const none = c.transparent;
  switch (variant) {
    case 'primary':
      return { bg: c.primary, fg: c.onPrimary, border: none };
    case 'secondary':
      return selected
        ? { bg: c.primarySoft, fg: c.text, border: c.text }
        : { bg: c.surface, fg: c.text, border: c.text, pressedBg: c.primarySoft };
    case 'success':
      return selected ? { bg: c.successStrong, fg: c.textOnAccent, border: c.successStrong } : { bg: c.surface, fg: c.success, border: c.success, pressedBg: c.successSoft };
    case 'danger':
      return selected ? { bg: c.dangerStrong, fg: c.textOnAccent, border: c.dangerStrong } : { bg: c.surface, fg: c.danger, border: c.danger, pressedBg: c.dangerSoft };
    case 'neutral':
      return selected ? { bg: c.neutralStrong, fg: c.textOnAccent, border: c.neutralStrong } : { bg: c.surface, fg: c.neutral, border: c.neutral, pressedBg: c.neutralSoft };
    case 'ghost':
    default:
      return { bg: none, fg: c.primaryText, border: none };
  }
}

/**
 * The app's buttons (design spec 3). primary: graphite (light) or lamp (dark) fill with the
 * `onPrimary` label; secondary, success, neutral, danger: a 1.5 pt outline in their ink;
 * ghost: a label that a highlighter swipe grows under while pressed. Fills, outlines and
 * label colors cross-fade between states. Only primary taps a haptic.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  selected = false,
  trailing,
  style,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { touch, tablet } = useWindowLayout();
  const c = theme.colors;
  const ghost = variant === 'ghost';
  // A disabled button reads as "not yet" (quiet grey), not as a faded alarm; loading keeps
  // its color under the loader.
  const look: Look =
    disabled && !loading && !ghost
      ? { bg: c.disabledBg, fg: c.disabledFg, border: c.transparent }
      : variantLook(theme, variant, selected);
  const inactive = disabled || loading;
  const { selectedBorder, iconSize } = theme.layout.system;
  const height = size === 'lg' ? touch + theme.spacing.lg : size === 'md' ? touch + theme.spacing.sm : touch;
  const outlined = look.border !== c.transparent;

  const fade = { duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const colorStyle = useAnimatedStyle(
    () => ({ backgroundColor: withTiming(look.bg, fade), borderColor: withTiming(look.border, fade) }),
    [look.bg, look.border, reduceMotion],
  );

  // Ghost: the highlighter swipe under the label grows while pressed.
  const swipe = useSharedValue(0);
  const swipeOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const [labelBox, setLabelBox] = useState({ w: 0, h: 0 });
  const onLabelLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.round(w) !== labelBox.w || Math.round(h) !== labelBox.h) setLabelBox({ w: Math.round(w), h: Math.round(h) });
  };
  useEffect(() => {
    if (reduceMotion) swipe.value = 1;
  }, [reduceMotion, swipe]);
  const pressSwipe = (on: boolean) => {
    if (!ghost) return;
    if (reduceMotion) {
      swipeOpacity.value = withTiming(on ? theme.opacity.ghostSwipeRm : 0, { duration: theme.motion.duration.instant, reduceMotion: ReduceMotion.Never });
      return;
    }
    swipe.value = on
      ? withTiming(1, { duration: theme.motion.highlight.pressGrow, easing: ease('highlighter') })
      : withTiming(0, { duration: theme.motion.highlight.retract, easing: ease('standard') });
  };

  const labelSizes = theme.layout.button.label[tablet ? 'tablet' : 'compact'];
  const labelSize = size === 'lg' ? labelSizes.lg : labelSizes.md;
  const iconPx = size === 'lg' ? iconSize.md : iconSize.sm;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, selected, busy: loading }}
      disabled={inactive}
      dimmed={disabled && ghost}
      pressedBg={look.pressedBg}
      onPressIn={() => pressSwipe(true)}
      onPressOut={() => pressSwipe(false)}
      onPress={() => {
        if (variant === 'primary') haptics.tap();
        onPress?.();
      }}
      style={[
        {
          minHeight: height,
          borderRadius: theme.radius.button,
          borderCurve: 'continuous',
          borderWidth: outlined || variant === 'secondary' ? selectedBorder : 0,
          boxShadow: variant === 'primary' && !disabled ? c.shadow.accent : c.shadow.none,
          paddingHorizontal: ghost ? theme.spacing.md : theme.spacing.lg,
          justifyContent: 'center',
        },
        // PressableScale is an Animated pressable; its prop type just doesn't say so.
        colorStyle as unknown as ViewStyle,
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
        {loading ? (
          <Loader color={look.fg} />
        ) : icon ? (
          <Icon name={icon} color={look.fg} size={iconPx} />
        ) : null}
        <View onLayout={ghost ? onLabelLayout : undefined} style={{ flexShrink: 1 }}>
          {ghost ? <HighlightBand width={labelBox.w} lineHeight={labelBox.h} progress={swipe} opacity={swipeOpacity} /> : null}
          <FadeText variant="label" tint={look.fg} weight="semibold" numberOfLines={1} style={{ fontSize: labelSize }}>
            {label}
          </FadeText>
        </View>
        {trailing}
      </View>
    </PressableScale>
  );
}
