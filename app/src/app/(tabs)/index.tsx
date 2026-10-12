import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useProfile } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { StatTile } from '../../components/StatTile';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';

export default function HomeScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const { openCamera, pickFromLibrary, busy } = usePickImage();
  const { refetch } = profile;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const p = profile.data;
  const streak = p?.streak ?? 0;

  return (
    <Screen title="Derece" subtitle="Bugün de bir adım öne geç.">
      {profile.isError ? (
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{profile.error.message}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          <View
            style={{
              width: theme.layout.minTouch + theme.spacing.lg,
              height: theme.layout.minTouch + theme.spacing.lg,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.streakSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="flame.fill" size={theme.layout.iconSize.lg} color={theme.colors.streak} />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="title" tint={theme.colors.streak}>
              {streak} gün
            </AppText>
            <AppText color="textMuted">{streak > 0 ? 'Serini bozma!' : 'Bugün bir seri başlat.'}</AppText>
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText variant="heading">Seviye {p?.level ?? 1}</AppText>
            <AppText variant="label" color="textMuted">
              {p ? `${p.levelXp} / ${p.levelXpRequired} XP` : '— XP'}
            </AppText>
          </View>
          <ProgressBar progress={p ? p.levelXp / p.levelXpRequired : 0} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <StatTile
          label="Bugünün tekrarı"
          value="—"
          caption="Tekrar sistemi yakında"
          icon="arrow.triangle.2.circlepath"
          color={theme.colors.primary}
          softColor={theme.colors.primarySoft}
        />
        <StatTile
          label="Bugünkü çalışma"
          value="0 dk"
          caption="Sayaç yakında"
          icon="timer"
          color={theme.colors.success}
          softColor={theme.colors.successSoft}
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Soru Çöz" icon="camera.fill" size="lg" onPress={openCamera} />
        <Button label="Galeriden seç" icon="photo.on.rectangle" variant="ghost" loading={busy} onPress={() => pickFromLibrary()} />
      </View>
    </Screen>
  );
}
