import { TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  invalid?: boolean;
  compact?: boolean;
}

/** Small numeric input with a label above (D / Y / B counts). */
export function NumberField({ label, value, onChangeText, invalid = false, compact = false }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xxs, alignItems: 'center' }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel={label}
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
        style={{
          width: theme.layout.minTouch + (compact ? 0 : theme.spacing.lg),
          height: theme.layout.minTouch,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.layout.borderWidth,
          borderColor: invalid ? theme.colors.danger : theme.colors.transparent,
          color: theme.colors.text,
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        }}
      />
    </View>
  );
}
