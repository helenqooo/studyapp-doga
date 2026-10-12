import { View } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';

/** Shown on the home and profile screens while the app runs on sample data. */
export function DemoBanner({ detail }: { detail?: string }) {
  const theme = useTheme();
  return (
    <Card background={theme.colors.hintBackground}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Icon name="sparkles" color={theme.colors.warning} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" color="warning">
            Demo modu
          </AppText>
          <AppText variant="label" color="textMuted">
            {detail ??
              'Sunucu olmadan örnek sorular ve örnek denemelerle çalışıyor. Yaptıkların uygulama kapanınca sıfırlanır.'}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
