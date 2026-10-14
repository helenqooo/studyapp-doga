import { useState, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useFontScale, useWindowLayout } from '../lib/layout';
import { font, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';
import { ease } from './motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Short help or error under the field. */
  hint?: string;
  error?: boolean;
  /** Password field with a show/hide toggle. */
  secret?: boolean;
  ref?: Ref<TextInput>;
}

export function TextField({ label, hint, error = false, secret = false, ref, ...input }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const reduceMotion = useReducedMotion();
  const { touch: minTouch } = useWindowLayout();
  const type = useFontScale();
  const { borderWidth, selectedBorder } = theme.layout.system;
  // Paper field with a soft edge; focus darkens the edge to graphite, an error to red pen.
  const edge = error ? theme.colors.danger : focused ? theme.colors.mark : theme.colors.border;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const edgeStyle = useAnimatedStyle(() => ({ borderColor: withTiming(edge, fade) }), [edge, reduceMotion]);
  // The thicker focus edge is drawn inward (the padding shrinks) so the text holds still.
  const thick = focused || error;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: minTouch + theme.spacing.sm,
            borderRadius: theme.radius.md,
            borderCurve: 'continuous',
            backgroundColor: theme.colors.surface,
            borderWidth: thick ? selectedBorder : borderWidth,
            paddingLeft: theme.spacing.md - (thick ? selectedBorder - borderWidth : 0),
          },
          edgeStyle,
        ]}
      >
        <TextInput
          {...input}
          ref={ref}
          accessibilityLabel={label}
          secureTextEntry={secret && !shown}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={{ flex: 1, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: type.md, ...font('sans') }}
        />
        {secret ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Şifreyi gizle' : 'Şifreyi göster'}
            onPress={() => setShown((v) => !v)}
            style={{ width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={shown ? 'eye-off' : 'eye'} size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
          </PressableScale>
        ) : null}
      </Animated.View>
      {hint ? (
        <AppText variant="caption" color={error ? 'danger' : 'textMuted'}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
