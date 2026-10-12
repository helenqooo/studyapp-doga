import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useProfile, useReviewsToday } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DemoBanner } from '../../components/DemoBanner';
import { Icon } from '../../components/Icon';
import { AnimatedNumber } from '../../components/motion/AnimatedNumber';
import { Appear } from '../../components/motion/Appear';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { StatTile } from '../../components/StatTile';
import { StreakFlame } from '../../components/StreakFlame';
import { DEMO_MODE } from '../../config';
import { useResponsive } from '../../lib/layout';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';

function SolveActions({ stacked }: { stacked: boolean }) {
  const theme = useTheme();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  const solve = <Button label="Soru Çöz" icon="camera" size="lg" onPress={openCamera} style={stacked ? undefined : { flex: 2 }} />;
  const gallery = (
    <Button
      label="Galeriden seç"
      icon="images"
      variant={stacked ? 'ghost' : 'secondary'}
      size={stacked ? 'md' : 'lg'}
      loading={busy}
      onPress={() => pickFromLibrary()}
      style={stacked ? undefined : { flex: 1 }}
    />
  );
  const sample = DEMO_MODE ? (
    <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" loading={busy} onPress={trySample} />
  ) : null;
  return stacked ? (
    <View style={{ gap: theme.spacing.sm }}>
      {solve}
      {gallery}
      {sample}
    </View>
  ) : (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {solve}
        {gallery}
      </View>
      {sample}
    </View>
  );
}

function HomeContent() {
  const theme = useTheme();
  const size = useResponsive<'compact' | 'regular' | 'wide'>({ compact: 'compact', regular: 'regular', wide: 'wide' });
  const profile = useProfile();
  const reviews = useReviewsToday();
  const { refetch: refetchProfile } = profile;
  const { refetch: refetchReviews } = reviews;

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchReviews();
    }, [refetchProfile, refetchReviews]),
  );

  const dueCount = reviews.data?.items.length;
  const reviewCaption =
    dueCount === undefined
      ? undefined
      : dueCount > 0
        ? 'Başlamak için dokun'
        : reviews.data?.completedToday
          ? 'Bugünlük bitti'
          : 'Bugün tekrar yok';

  const p = profile.data;
  const streak = p?.streak ?? 0;

  const progress = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <StreakFlame active={streak > 0} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AnimatedNumber variant="title" tint={theme.colors.primaryText} value={streak} format={(n) => `${Math.round(n)} gün`} />
          <AppText color="textMuted">{streak > 0 ? 'Serini bozma!' : 'Bugün bir seri başlat.'}</AppText>
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="heading">Seviye {p?.level ?? 1}</AppText>
          {p ? (
            <AnimatedNumber
              variant="label"
              color="textMuted"
              value={p.levelXp}
              format={(n) => `${Math.round(n)} / ${p.levelXpRequired} XP`}
            />
          ) : (
            <AppText variant="label" color="textMuted">
              — XP
            </AppText>
          )}
        </View>
        <ProgressBar progress={p ? p.levelXp / p.levelXpRequired : 0} />
      </View>
    </Card>
  );

  const tiles = (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <StatTile
        label="Bugünün tekrarı"
        value={dueCount === undefined ? '—' : `${dueCount} soru`}
        caption={reviewCaption}
        icon="repeat"
        color={theme.colors.primaryText}
        softColor={theme.colors.primarySoft}
        onPress={() => (dueCount ? router.push('/review-session') : router.navigate('/review'))}
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
  );

  const demo = DEMO_MODE ? <DemoBanner /> : null;
  const error = profile.isError ? (
    <Card background={theme.colors.dangerSoft}>
      <AppText color="danger">{profile.error.message}</AppText>
    </Card>
  ) : null;

  if (size === 'wide') {
    // iPad landscape: progress and stats on the left, the main action as its own card.
    return (
      <>
        {demo}
        {error}
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'stretch' }}>
          <View style={{ flex: 1.4, gap: theme.spacing.lg }}>
            <Appear>{progress}</Appear>
            <Appear index={1}>{tiles}</Appear>
          </View>
          <Appear index={2} style={{ flex: 1 }}>
            <Card style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
                <Icon name="scan-line" size={theme.layout.iconSize.xl} color={theme.colors.primaryText} />
                <AppText color="textMuted" align="center">
                  Takıldığın soruyu çek; ipucu al ya da tam çözümü gör.
                </AppText>
              </View>
              <SolveActions stacked />
            </Card>
          </Appear>
        </View>
      </>
    );
  }

  return (
    <>
      {demo}
      {error}
      <Appear>{progress}</Appear>
      <Appear index={1}>{tiles}</Appear>
      <Appear index={2}>
        <SolveActions stacked={size === 'compact'} />
      </Appear>
    </>
  );
}

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

export default function HomeScreen() {
  return (
    <Screen title={greeting(new Date().getHours())} titleIcon="asterisk" subtitle="Bugün de bir adım öne geç.">
      <HomeContent />
    </Screen>
  );
}
