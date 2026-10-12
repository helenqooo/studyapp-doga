import type { StyleProp, ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion/PressableScale';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Raw color token value used when selected; defaults to primary. */
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** Tappable filter / suggestion pill. */
export function Chip({ label, selected = false, onPress, color, icon, style }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;
  const fg = selected ? theme.colors.textOnAccent : theme.colors.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          minHeight: theme.layout.minTouch - theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          backgroundColor: selected ? accent : theme.colors.surface,
          borderWidth: theme.layout.borderWidth,
          borderColor: selected ? accent : theme.colors.border,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={theme.fontSize.sm} color={fg} /> : null}
      <AppText variant="label" tint={fg}>
        {label}
      </AppText>
    </PressableScale>
  );
}
