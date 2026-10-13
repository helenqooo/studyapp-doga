import { View } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';

/** "Soru metnini göster": a quiet pill that opens the typed-out copy of a photographed question. */
export function TextToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
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
        <Icon name={open ? 'chevron-up' : 'text-align-start'} size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
        <AppText variant="label" color="textMuted">
          {open ? 'Metni gizle' : 'Soru metni'}
        </AppText>
      </View>
    </PressableScale>
  );
}
