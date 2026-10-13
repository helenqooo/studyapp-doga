import { View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme, elevated } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion/PressableScale';

interface Props {
  label: string;
  value: string;
  icon: IconName;
  /** Raw color token values for the icon and its badge background. */
  color?: string;
  softColor?: string;
  caption?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({ label, value, icon, color, softColor, caption, onPress, style }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primaryText;
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={[
        {
          flex: 1,
          ...elevated(theme),
          padding: theme.layout.cardPadding,
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
    </PressableScale>
  );
}
