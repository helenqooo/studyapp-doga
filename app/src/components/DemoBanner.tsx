import { useState } from 'react';
import { View } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';

const DEFAULT_DETAIL = 'Sunucu olmadan örnek sorular ve örnek denemelerle çalışıyor. Yaptıkların uygulama kapanınca sıfırlanır.';

/**
 * Shown on the home and profile screens while the app runs on sample data.
 * `compact` is a small pill that opens the full note on tap, so it doesn't push the
 * page's real content down.
 */
export function DemoBanner({ detail, compact = false }: { detail?: string; compact?: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(!compact);
  if (!open) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Demo modu, ayrıntılar"
        onPress={() => {
          haptics.select();
          setOpen(true);
        }}
        hitSlop={theme.spacing.sm}
        style={{ alignSelf: 'flex-start' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            minHeight: theme.layout.minTouch - theme.spacing.lg,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.hintBackground,
          }}
        >
          <Icon name="sparkles" size={theme.layout.iconSize.sm} color={theme.colors.warning} />
          <AppText variant="caption" weight="semibold" color="warning">
            Demo · örnek veri
          </AppText>
        </View>
      </PressableScale>
    );
  }
  return (
    <Card background={theme.colors.hintBackground}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="sparkles" color={theme.colors.warning} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" color="warning">
            Demo modu
          </AppText>
          <AppText variant="label" color="textMuted">
            {detail ?? DEFAULT_DETAIL}
          </AppText>
        </View>
        {compact ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => setOpen(false)} hitSlop={theme.spacing.sm}>
            <Icon name="x" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>
    </Card>
  );
}
