import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme, type Theme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion/PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Visually marks a chosen option in a group (e.g. the selected result). */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

function variantColors(theme: Theme, variant: ButtonVariant, selected: boolean) {
  const c = theme.colors;
  switch (variant) {
    case 'primary':
      return { bg: c.primary, fg: c.textOnAccent };
    case 'secondary':
      return { bg: c.primarySoft, fg: c.primaryText };
    case 'success':
      return selected ? { bg: c.successStrong, fg: c.textOnAccent } : { bg: c.successSoft, fg: c.success };
    case 'danger':
      return selected ? { bg: c.dangerStrong, fg: c.textOnAccent } : { bg: c.dangerSoft, fg: c.danger };
    case 'neutral':
      return selected ? { bg: c.neutralStrong, fg: c.textOnAccent } : { bg: c.neutralSoft, fg: c.neutral };
    case 'ghost':
    default:
      return { bg: c.transparent, fg: c.primaryText };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  selected = false,
  style,
}: Props) {
  const theme = useTheme();
  const { bg, fg } = variantColors(theme, variant, selected);
  const inactive = disabled || loading;
  const height = size === 'lg' ? theme.layout.minTouch + theme.spacing.xl : theme.layout.minTouch + theme.spacing.xs;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, selected }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={[
        {
          minHeight: height,
          backgroundColor: bg,
          borderRadius: size === 'lg' ? theme.radius.xl : theme.radius.md,
          paddingHorizontal: theme.spacing.lg,
          justifyContent: 'center',
          opacity: inactive ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : icon ? (
          <Icon name={icon} color={fg} size={size === 'lg' ? theme.layout.iconSize.lg : theme.layout.iconSize.sm} />
        ) : null}
        <AppText
          variant={size === 'lg' ? 'heading' : 'label'}
          tint={fg}
          weight="semibold"
          numberOfLines={1}
          style={size === 'lg' ? { fontSize: theme.fontSize.xl } : null}
        >
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}
