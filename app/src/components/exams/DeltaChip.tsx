import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatDelta } from '../../lib/format';
import { useTheme, type Theme } from '../../theme';
import { AppText } from '../AppText';
import { Highlight } from '../Highlight';
import { Icon, type IconName } from '../Icon';
import { FadeText } from '../motion/FadeText';
import { ease } from '../motion/presets';

/** Below this a change reads as "no change" (nets move in quarters). */
const FLAT = 0.005;

type Tone = { fg: string; bg: string; icon: IconName };

function toneOf(theme: Theme, delta: number): Tone {
  const c = theme.colors;
  if (delta > FLAT) return { fg: c.success, bg: c.successSoft, icon: 'arrow-up-right' };
  if (delta < -FLAT) return { fg: c.danger, bg: c.dangerSoft, icon: 'arrow-down-right' };
  return { fg: c.neutral, bg: c.neutralSoft, icon: 'minus' };
}

/**
 * The tone's arrow; a change lays the previous arrow over the new one and fades it out
 * (same pattern as FadeText), so the glyph and its color never cut. Nothing animates on mount.
 */
function FadeIcon({ name, color, duration }: { name: IconName; color: string; duration: number }) {
  const theme = useTheme();
  const size = theme.layout.system.iconSize.sm;
  const [look, setLook] = useState({ name, color, prev: null as { name: IconName; color: string } | null });
  const old = useSharedValue(0);

  if (look.name !== name || look.color !== color) {
    setLook({ name, color, prev: { name: look.name, color: look.color } });
  }

  useEffect(() => {
    if (!look.prev) return;
    old.value = 1;
    old.value = withTiming(0, { duration, easing: ease('standard'), reduceMotion: ReduceMotion.Never });
  }, [look, old, duration]);

  const oldStyle = useAnimatedStyle(() => ({ opacity: old.value }));
  const newStyle = useAnimatedStyle(() => ({ opacity: 1 - old.value }));

  return (
    <View>
      <Animated.View style={newStyle}>
        <Icon name={look.name} size={size} color={look.color} weight="bold" />
      </Animated.View>
      {look.prev ? (
        <Animated.View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, oldStyle]}>
          <Icon name={look.prev.name} size={size} color={look.prev.color} weight="bold" />
        </Animated.View>
      ) : null}
    </View>
  );
}

interface Props {
  delta: number;
  /** A companion highlight target on the number (e.g. `exams.summary.TYT`). */
  highlightId?: string;
  /** A muted word after the chip, e.g. "öncekine göre". */
  caption?: string;
  /** Sets the caption under the chip instead of beside it (a narrow column next to a chart). */
  captionBelow?: boolean;
  /** `pill` (default): a soft tinted pill. `plain`: the arrow and number alone, for list rows. */
  look?: 'pill' | 'plain';
  style?: StyleProp<ViewStyle>;
}

/**
 * A change against the previous exam: a soft pill in the verdict's tint (green up, red pen
 * down, neutral flat) with the signed net in numeric figures. Tint changes cross-fade.
 */
export function DeltaChip({ delta, highlightId, caption, captionBelow = false, look = 'pill', style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const tone = toneOf(theme, delta);
  const plain = look === 'plain';
  const duration = reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base;
  const fade = { duration, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const bg = plain ? theme.colors.transparent : tone.bg;
  const fill = useAnimatedStyle(() => ({ backgroundColor: withTiming(bg, fade) }), [bg, reduceMotion]);
  const text = formatDelta(delta);
  const label = `${text} net${caption ? ` ${caption}` : ''}`;

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        captionBelow
          ? { alignItems: 'flex-start', gap: theme.spacing.xxs }
          : { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xxs,
            paddingHorizontal: plain ? 0 : theme.spacing.sm,
            paddingVertical: plain ? 0 : theme.spacing.xxs,
            borderRadius: theme.radius.pill,
            borderCurve: 'continuous',
          },
          fill,
        ]}
      >
        <FadeIcon name={tone.icon} color={tone.fg} duration={duration} />
        {highlightId ? (
          <Highlight id={highlightId}>
            {/* FadeText takes Highlight's tint and numberOfLines like AppText does. */}
            <FadeText variant="numeric" tint={tone.fg}>
              {text}
            </FadeText>
          </Highlight>
        ) : (
          <FadeText variant="numeric" tint={tone.fg}>
            {text}
          </FadeText>
        )}
      </Animated.View>
      {caption ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}
