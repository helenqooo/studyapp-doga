import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';
import { useStateFade } from './states/EmptyState';

const DEFAULT_DETAIL = 'Sunucu olmadan örnek sorular ve örnek denemelerle çalışıyor. Yaptıkların uygulama kapanınca sıfırlanır.';

/**
 * Shown on the home and profile screens while the app runs on sample data.
 * `compact` is a small 44 pt pill that opens the full note on tap, so it doesn't push the
 * page's real content down. Opening and closing cross-fade; the first paint does not.
 */
export function DemoBanner({ detail, compact = false }: { detail?: string; compact?: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(!compact);
  // Only a tap cross-fades; the first paint just shows the banner.
  const [toggled, setToggled] = useState(false);
  const fade = useStateFade();
  const entering = toggled ? fade : undefined;
  const ink = theme.colors.noteInk;

  const toggle = (next: boolean) => {
    haptics.select();
    setToggled(true);
    setOpen(next);
  };

  if (!open) {
    return (
      <Animated.View key="pill" entering={entering} style={{ alignSelf: 'flex-start' }}>
        <PressableScale
          kind="bubble"
          accessibilityRole="button"
          accessibilityLabel="Demo, örnek veri"
          accessibilityHint="Ayrıntıları gösterir"
          onPress={() => toggle(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            minHeight: theme.layout.minTouch,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            borderCurve: 'continuous',
            borderWidth: theme.layout.borderWidth,
            borderColor: theme.colors.noteEdge,
            backgroundColor: theme.colors.hintBackground,
          }}
        >
          <Icon name="sparkles" size={theme.layout.iconSize.sm} color={theme.colors.warning} />
          <AppText variant="label" weight="semibold" tint={ink}>
            Demo, örnek veri
          </AppText>
        </PressableScale>
      </Animated.View>
    );
  }
  return (
    <Animated.View key="note" entering={entering}>
      <Card variant="sheet" background={theme.colors.hintBackground}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Icon name="sparkles" color={theme.colors.warning} />
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText weight="semibold" tint={ink}>
              Demo modu
            </AppText>
            <AppText variant="label" tint={ink}>
              {detail ?? DEFAULT_DETAIL}
            </AppText>
          </View>
          {compact ? (
            <PressableScale
              kind="bubble"
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={() => toggle(false)}
              style={{
                width: theme.layout.minTouch,
                height: theme.layout.minTouch,
                alignItems: 'center',
                justifyContent: 'center',
                margin: -theme.spacing.md,
              }}
            >
              <Icon name="x" size={theme.layout.iconSize.sm} color={ink} />
            </PressableScale>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}
