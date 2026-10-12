import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { font, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Short help or error under the field. */
  hint?: string;
  error?: boolean;
  /** Password field with a show/hide toggle. */
  secret?: boolean;
}

export function TextField({ label, hint, error = false, secret = false, ...input }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: theme.layout.minTouch + theme.spacing.sm,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.layout.borderWidth,
          borderColor: error ? theme.colors.danger : focused ? theme.colors.primaryText : theme.colors.transparent,
          paddingLeft: theme.spacing.md,
        }}
      >
        <TextInput
          {...input}
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
          style={{ flex: 1, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: theme.fontSize.md, ...font('sans') }}
        />
        {secret ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Şifreyi gizle' : 'Şifreyi göster'}
            onPress={() => setShown((v) => !v)}
            style={{ width: theme.layout.minTouch, height: theme.layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={shown ? 'eye-off' : 'eye'} size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" color={error ? 'danger' : 'textMuted'}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
