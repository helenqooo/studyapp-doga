import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  label: string;
  value: string;
  icon: IconName;
  /** Raw color token values for the icon and its badge background. */
  color?: string;
  softColor?: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({ label, value, icon, color, softColor, caption, style }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: theme.layout.borderWidth,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          width: theme.layout.minTouch - theme.spacing.xs,
          height: theme.layout.minTouch - theme.spacing.xs,
          borderRadius: theme.radius.md,
          backgroundColor: softColor ?? theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={accent} />
      </View>
      <AppText variant="title">{value}</AppText>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      {caption ? (
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}
