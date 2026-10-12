import { useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { useProfile } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DemoBanner } from '../../components/DemoBanner';
import { Columns } from '../../components/Grid';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { API_URL, APP_TOKEN, DEMO_MODE } from '../../config';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';

type CheckState = { status: 'idle' } | { status: 'running' } | { status: 'ok' } | { status: 'error'; message: string };

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });

  const runCheck = async () => {
    setCheck({ status: 'running' });
    try {
      await api.health();
      await api.profile();
      haptics.success();
      setCheck({ status: 'ok' });
    } catch (e) {
      haptics.error();
      setCheck({ status: 'error', message: e instanceof ApiError ? e.message : 'Bilinmeyen hata.' });
    }
  };

  const p = profile.data;

  return (
    <Screen title="Profil">
      <Columns
        left={
          <Card title="İstatistikler">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText>Seviye</AppText>
              <AppText weight="semibold">{p?.level ?? '—'}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText>Toplam XP</AppText>
              <AppText weight="semibold">{p?.xp ?? '—'}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText>En uzun seri</AppText>
              <AppText weight="semibold">{p ? `${p.longestStreak} gün` : '—'}</AppText>
            </View>
            <AppText variant="caption" color="textMuted">
              Rozetler ve ayrıntılı istatistikler sonraki fazlarda gelecek.
            </AppText>
          </Card>
        }
        right={
          DEMO_MODE ? (
            <DemoBanner
              detail={
                API_URL
                  ? "EXPO_PUBLIC_DEMO=1 olduğu için uygulama örnek verilerle çalışıyor. Sunucuya bağlanmak için bu değişkeni kaldır ve Expo'yu yeniden başlat."
                  : "Sunucu adresi tanımlı değil, uygulama örnek verilerle çalışıyor. Gerçek kullanım için app/.env içine EXPO_PUBLIC_API_URL ve EXPO_PUBLIC_APP_TOKEN yaz, Expo'yu yeniden başlat."
              }
            />
          ) : (
            <Card title="Sunucu bağlantısı">
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="caption" color="textMuted">
                  API adresi
                </AppText>
                <AppText selectable>{API_URL || 'Tanımlı değil (EXPO_PUBLIC_API_URL)'}</AppText>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="caption" color="textMuted">
                  Uygulama anahtarı
                </AppText>
                <AppText>{APP_TOKEN ? `Tanımlı (${APP_TOKEN.length} karakter)` : 'Tanımlı değil (EXPO_PUBLIC_APP_TOKEN)'}</AppText>
              </View>

              {check.status === 'ok' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon name="circle-check" color={theme.colors.success} />
                  <AppText color="success" weight="semibold">
                    Bağlantı ve anahtar çalışıyor.
                  </AppText>
                </View>
              ) : null}
              {check.status === 'error' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon name="triangle-alert" color={theme.colors.danger} />
                  <AppText color="danger" style={{ flex: 1 }}>
                    {check.message}
                  </AppText>
                </View>
              ) : null}

              <Button
                label="Bağlantıyı test et"
                icon="wifi"
                variant="secondary"
                loading={check.status === 'running'}
                onPress={runCheck}
              />
            </Card>
          )
        }
      />
    </Screen>
  );
}
