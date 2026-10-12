import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  label: string;
  /** Raw color token value for text/icon; the background is a tinted version of it unless `background` is set. */
  color?: string;
  background?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** Small pill used for exam / subject / topic chips. */
export function Badge({ label, color, background, icon, style }: Props) {
  const theme = useTheme();
  const fg = color ?? theme.colors.primary;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          alignSelf: 'flex-start',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.pill,
          backgroundColor: background ?? theme.colors.surfaceAlt,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={theme.fontSize.sm} color={fg} /> : null}
      <AppText variant="caption" weight="bold" tint={fg}>
        {label}
      </AppText>
    </View>
  );
}
