import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useFontScale, useWindowLayout } from '../lib/layout';
import { font, useTheme } from '../theme';
import { AppText } from './AppText';
import { ease } from './motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  invalid?: boolean;
  /** A topic's D / Y / B well: one touch target tall. */
  compact?: boolean;
  /** The label stays for VoiceOver but isn't drawn (a table header names the column). */
  hideLabel?: boolean;
  /** Overrides the well's width, so wells line up under a table header. */
  width?: number;
  /** What VoiceOver reads (e.g. "Türkçe doğru"); defaults to `label`. */
  accessibilityLabel?: string;
}

/**
 * Numeric well with a label above (D / Y / B counts), figures in the display face. As tall
 * as a TextField (52 pt on a phone, 56 on a tablet); a compact well is one touch target.
 * The edge cross-fades: graphite while focused, red pen when invalid.
 */
export function NumberField({ label, value, onChangeText, invalid = false, compact = false, hideLabel = false, width, accessibilityLabel }: Props) {
  const theme = useTheme();
  const sizes = useFontScale();
  const { touch } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const { selectedBorder } = theme.layout.system;
  const height = compact ? touch : touch + theme.spacing.sm;
  const edge = invalid ? theme.colors.danger : focused ? theme.colors.mark : theme.colors.transparent;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const edgeStyle = useAnimatedStyle(() => ({ borderColor: withTiming(edge, fade) }), [edge, reduceMotion]);

  return (
    <View style={{ gap: theme.spacing.xxs, alignItems: 'center' }}>
      {hideLabel ? null : (
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
      )}
      <Animated.View
        style={[
          {
            width: width ?? touch + (compact ? 0 : theme.spacing.xl),
            height,
            borderRadius: theme.radius.md,
            borderCurve: 'continuous',
            borderWidth: selectedBorder,
            backgroundColor: theme.colors.surfaceAlt,
            justifyContent: 'center',
          },
          edgeStyle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={accessibilityLabel ?? label}
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          style={{
            height: '100%',
            color: theme.colors.text,
            fontSize: sizes.xl,
            ...font('display', 'medium'),
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        />
      </Animated.View>
    </View>
  );
}
