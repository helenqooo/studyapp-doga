import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useFontScale } from '../lib/layout';
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
  compact?: boolean;
}

/**
 * Small numeric well with a label above (D / Y / B counts), figures in the display face.
 * The edge cross-fades: graphite while focused, red pen when invalid.
 */
export function NumberField({ label, value, onChangeText, invalid = false, compact = false }: Props) {
  const theme = useTheme();
  const sizes = useFontScale();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const { minTouch, selectedBorder } = theme.layout.system;
  const edge = invalid ? theme.colors.danger : focused ? theme.colors.mark : theme.colors.transparent;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const edgeStyle = useAnimatedStyle(() => ({ borderColor: withTiming(edge, fade) }), [edge, reduceMotion]);

  return (
    <View style={{ gap: theme.spacing.xxs, alignItems: 'center' }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <Animated.View
        style={[
          {
            width: minTouch + (compact ? 0 : theme.spacing.lg),
            height: minTouch,
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
          accessibilityLabel={label}
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
