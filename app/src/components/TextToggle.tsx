import { View } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion/PressableScale';

interface Props {
  open: boolean;
  onToggle: () => void;
  /** The closed label; default "Soru metni" (e.g. "Şıkları yazıyla gör"). */
  label?: string;
  /** The open label; default "Metni gizle". */
  openLabel?: string;
  /** The closed icon; default `text-align-start`. */
  icon?: IconName;
}

/** "Soru metni": a quiet pill that opens a typed-out copy (the question, its choices). */
export function TextToggle({ open, onToggle, label = 'Soru metni', openLabel = 'Metni gizle', icon = 'text-align-start' }: Props) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? openLabel : label}
      onPress={() => {
        haptics.select();
        onToggle();
      }}
      hitSlop={theme.spacing.sm}
      style={{ alignSelf: 'flex-start' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          minHeight: theme.layout.minTouch - theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Icon name={open ? 'chevron-up' : icon} size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
        <AppText variant="label" color="textMuted">
          {open ? openLabel : label}
        </AppText>
      </View>
    </PressableScale>
  );
}
