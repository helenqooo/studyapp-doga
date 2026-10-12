import { View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion/PressableScale';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Raw color token (e.g. a subject color). Selected, it outlines the chip and fills its dot; text stays in the text color. */
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** Tappable filter / suggestion pill. */
export function Chip({ label, selected = false, onPress, color, icon, style }: Props) {
  const theme = useTheme();
  // White text only on the primary fill; a custom hue would fail contrast under white.
  const filled = selected && !color;
  const fg = filled ? theme.colors.textOnAccent : theme.colors.text;
  const background = filled ? theme.colors.primary : selected ? theme.colors.surfaceAlt : theme.colors.surface;
  const border = selected ? (color ?? theme.colors.primary) : theme.colors.border;
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
          backgroundColor: background,
          borderWidth: theme.layout.borderWidth,
          borderColor: border,
        },
        style,
      ]}
    >
      {color ? (
        <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: color }} />
      ) : null}
      {icon ? <Icon name={icon} size={theme.fontSize.sm} color={fg} /> : null}
      <AppText variant="label" tint={fg} weight={selected ? 'semibold' : undefined}>
        {label}
      </AppText>
    </PressableScale>
  );
}
