import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useLeaderboard, useProfile, useReviewsToday, useStudyDay } from '../../api/hooks';
import { ErrorState } from '../../components/states/ErrorState';
import { TodayRings, type RingValue } from '../../components/TodayRings';
import type { Leaderboard } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { MascotNote } from '../../components/mascot/MascotNote';
import type { MascotMood } from '../../components/mascot/Mascot';
import { DemoBanner } from '../../components/DemoBanner';
import { Icon } from '../../components/Icon';
import { PressableScale } from '../../components/motion/PressableScale';
import { AnimatedNumber } from '../../components/motion/AnimatedNumber';
import { Appear } from '../../components/motion/Appear';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { StreakFlame } from '../../components/StreakFlame';
import { ASSISTANT_NAME } from '../../brand';
import { DAILY_GOALS, DEMO_MODE } from '../../config';
import { YKS_DATE } from '../../data/exam';
import { dayTitle, daysBetween, localToday, upperTr } from '../../lib/format';
import { useResponsive } from '../../lib/layout';
import { suffix } from '../../lib/turkish';
import { formatClock, useNow } from '../../lib/useNow';
import { haptics } from '../../lib/haptics';
import { useAuthStore } from '../../store/authStore';
import { remainingMs, useTimerStore } from '../../store/timerStore';
import { usePickImage } from '../../lib/usePickImage';
import { elevated, useTheme } from '../../theme';

function SolveActions({ stacked }: { stacked: boolean }) {
  const theme = useTheme();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  const solve = <Button label="Soru Çöz" icon="camera" size="lg" onPress={openCamera} style={stacked ? undefined : { flex: 1 }} />;
  const sample = DEMO_MODE ? (
    <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" loading={busy} onPress={trySample} />
  ) : null;
  if (stacked) {
    return (
      <View style={{ gap: theme.spacing.sm }}>
        {solve}
        <Button label="Galeriden seç" icon="images" variant="ghost" loading={busy} onPress={() => pickFromLibrary()} />
        {sample}
      </View>
    );
  }
  // The big bar plus a square gallery button: one row, above the fold.
  const side = theme.layout.minTouch + theme.spacing.xl;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {solve}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Galeriden seç"
          disabled={busy}
          dimmed={busy}
          onPress={() => {
            haptics.tap();
            pickFromLibrary();
          }}
          style={{
            width: side,
            height: side,
            borderRadius: theme.radius.xl,
            borderCurve: 'continuous',
            backgroundColor: theme.colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="images" size={theme.layout.iconSize.lg} color={theme.colors.primaryText} />
        </PressableScale>
      </View>
      {sample}
    </View>
  );
}

/** One line of the rings' legend: a colored dot, the goal and where it stands; tap to go there. */
function GoalRow({ color, label, value, caption, onPress }: { color: string; label: string; value: string; caption?: string; onPress: () => void }) {
  const theme = useTheme();
  const dot = theme.layout.todayRings.dot;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ''}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      scaleTo={0.98}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.layout.minTouch - theme.spacing.sm }}
    >
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText weight="semibold">{label}</AppText>
          <AppText variant="label" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </AppText>
        </View>
        {caption ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
    </PressableScale>
  );
}

/** Once per day: a light success tap when all three rings close. */
let ringsLitFor: string | null = null;

/** "You're 2nd this week, 35 XP behind Elif" — a one-line race status. */
function raceLine(board: Leaderboard | undefined): { title: string; detail: string } | null {
  const items = board?.items ?? [];
  const me = items.find((e) => e.isMe);
  if (!me || items.length < 2) return null;
  if (me.rank === 1) {
    const second = items.find((e) => !e.isMe);
    const lead = second ? me.xp - second.xp : 0;
    return { title: 'Bu hafta 1. sıradasın', detail: lead > 0 ? `${second!.displayName} ${lead} XP geride.` : 'Zirvede başa baş gidiyorsunuz.' };
  }
  const ahead = items.filter((e) => e.xp > me.xp).at(-1);
  return {
    title: `Bu hafta ${me.rank}. sıradasın`,
    detail: ahead ? `${suffix(ahead.displayName, 'acc')} geçmek için ${ahead.xp - me.xp + 1} XP.` : '',
  };
}

function LeagueCard() {
  const theme = useTheme();
  const board = useLeaderboard('week');
  const line = raceLine(board.data);
  if (!line) return null;
  const top = board.data!.items.slice(0, 4);
  return (
    <PressableCard onPress={() => router.push('/leaderboard')} label={`${line.title}. ${line.detail} Sıralamayı aç.`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          {top.map((e, i) => (
            <View key={e.userId} style={{ marginLeft: i ? -theme.spacing.sm : 0, borderRadius: theme.radius.pill, borderWidth: theme.layout.frameBorder, borderColor: theme.colors.surface }}>
              <Avatar name={e.displayName} color={e.avatar} size={theme.layout.avatar * 0.8} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold">{line.title}</AppText>
          {line.detail ? (
            <AppText variant="label" color="textMuted">
              {line.detail}
            </AppText>
          ) : null}
        </View>
        <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
      </View>
    </PressableCard>
  );
}

function PressableCard({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.99}
      style={{
        ...elevated(theme),
        padding: theme.layout.cardPadding,
      }}
    >
      {children}
    </PressableScale>
  );
}

/** What Lumi says (and how it looks) on the home screen, from the most useful next step down. */
function lumiLine(o: {
  phase: 'idle' | 'focus' | 'break';
  due?: number;
  streak: number;
  streakToday: boolean;
  hour: number;
  /** All of today's rings are closed. */
  ringsClosed: boolean;
}): { mood: MascotMood; title: string; body: string } {
  if (o.phase === 'focus') return { mood: 'focus', title: 'Odaktasın.', body: 'Bitince haber veririm, molayı ben başlatırım.' };
  if (o.phase === 'break') return { mood: 'break', title: 'Mola zamanı.', body: 'Biraz su iç, gözlerini dinlendir.' };
  if (o.ringsClosed) return { mood: 'celebrate', title: 'Bugünün halkası tamam!', body: 'Üç hedef de kapandı. Gerisi bonus; istersen bir soru daha.' };
  if (o.hour >= 0 && o.hour < 5) return { mood: 'sleepy', title: 'Geç oldu…', body: 'Uykusuz beyin unutkan olur. Yarın taze kafayla devam edelim.' };
  if (o.due) return { mood: 'reading', title: `Bugün ${o.due} soru tekrar bekliyor.`, body: 'Unutmadan önce bir bakalım; birkaç dakika sürer.' };
  if (o.streak > 0 && !o.streakToday) return { mood: 'cheer', title: `Serin ${o.streak} gün!`, body: 'Bugün bir pomodoro ya da tekrar seriyi korur.' };
  if (o.streakToday) return { mood: 'proud', title: 'Bugünlük harikasın.', body: 'Takıldığın bir soru olursa çek, birlikte bakalım.' };
  return { mood: 'wave', title: 'Merhaba, ben Lumi!', body: 'Takıldığın soruyu çek: önce ipucu veririm, istersen tam çözümü.' };
}

function HomeContent() {
  const theme = useTheme();
  const size = useResponsive<'compact' | 'regular' | 'wide'>({ compact: 'compact', regular: 'regular', wide: 'wide' });
  const profile = useProfile();
  const reviews = useReviewsToday();
  const study = useStudyDay();
  const timer = useTimerStore();
  const timerRunning = timer.phase !== 'idle';
  const now = useNow(timerRunning && timer.endsAt !== null);
  const { refetch: refetchProfile } = profile;
  const { refetch: refetchReviews } = reviews;
  const { refetch: refetchStudy } = study;

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchReviews();
      refetchStudy();
    }, [refetchProfile, refetchReviews, refetchStudy]),
  );

  const dueCount = reviews.data?.items.length;
  const doneReviews = reviews.data?.completedToday ?? 0;
  const reviewGoal = (dueCount ?? 0) + doneReviews;
  const focusMin = study.data ? study.data.focusSec / 60 : 0;
  const solved = study.data?.solved ?? 0;
  const loaded = !!reviews.data && !!study.data;
  const today = localToday();

  // Today's three rings: reviews cleared, focus minutes, questions solved. No reviews due
  // counts as a quiet, closed ring.
  const rings: RingValue[] = [
    { progress: !loaded ? 0 : reviewGoal ? doneReviews / reviewGoal : 1, color: reviewGoal ? theme.colors.rings.review : theme.colors.border },
    { progress: loaded ? focusMin / DAILY_GOALS.focusMinutes : 0, color: theme.colors.rings.focus },
    { progress: loaded ? solved / DAILY_GOALS.solved : 0, color: theme.colors.rings.solve },
  ];
  const ringsClosed = loaded && rings.every((r) => r.progress >= 1);
  if (ringsClosed && ringsLitFor !== today) {
    ringsLitFor = today;
    haptics.success();
  }

  const p = profile.data;
  const streak = p?.streak ?? 0;
  const line = lumiLine({ phase: timer.phase, due: dueCount, streak, streakToday: !!p?.streakToday, hour: new Date().getHours(), ringsClosed });

  const hero = (
    <Card variant="hero">
      <MascotNote mood={line.mood} title={line.title}>
        {line.body}
      </MascotNote>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <TodayRings rings={rings} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <GoalRow
            color={rings[0]!.color}
            label="Tekrar"
            value={dueCount === undefined ? '—' : reviewGoal ? `${doneReviews}/${reviewGoal}` : 'bugün yok'}
            caption={dueCount ? 'Dokun, başla' : doneReviews ? 'Bugünlük bitti' : undefined}
            onPress={() => (dueCount ? router.push('/review-session') : router.navigate('/review'))}
          />
          <GoalRow
            color={rings[1]!.color}
            label="Odak"
            value={study.data ? `${Math.round(focusMin)}/${DAILY_GOALS.focusMinutes} dk` : '—'}
            caption={
              timerRunning
                ? `${timer.phase === 'focus' ? 'Odakta' : 'Molada'} · ${formatClock(remainingMs(timer, now))}`
                : study.data?.pomodoros
                  ? `${study.data.pomodoros} pomodoro`
                  : 'Sayacı başlat'
            }
            onPress={() => router.push('/timer')}
          />
          <GoalRow
            color={rings[2]!.color}
            label="Soru"
            value={study.data ? `${solved}/${DAILY_GOALS.solved}` : '—'}
            caption={solved >= DAILY_GOALS.solved ? 'Hedef tamam' : 'Kamerayı aç'}
            onPress={() => router.push('/camera')}
          />
        </View>
      </View>
    </Card>
  );

  const progress = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <StreakFlame active={streak > 0} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AnimatedNumber variant="title" tint={theme.colors.primaryText} value={streak} format={(n) => `${Math.round(n)} gün`} />
          <AppText color="textMuted">
            {streak === 0
              ? 'Bir pomodoro ya da bugünün tekrarı seriyi başlatır.'
              : p?.streakToday
                ? 'Bugün tamam. Yarın da gel.'
                : 'Seri bugün bitmesin: bir pomodoro yeter.'}
          </AppText>
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

  const ask = <Button label={`${ASSISTANT_NAME}'ye sor`} icon="message-circle" variant="ghost" onPress={() => router.push('/assistant')} />;
  const demo = DEMO_MODE ? <DemoBanner compact /> : null;
  const error = profile.isError ? <ErrorState error={profile.error} onRetry={() => refetchProfile()} /> : null;

  if (size === 'wide') {
    // iPad landscape: today and progress on the left, the main action as its own card.
    return (
      <>
        {demo}
        {error}
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'stretch' }}>
          <View style={{ flex: 1.4, gap: theme.spacing.lg }}>
            <Appear>{hero}</Appear>
            <Appear index={1}>{progress}</Appear>
            <Appear index={2}>
              <LeagueCard />
            </Appear>
          </View>
          <Appear index={1} style={{ flex: 1 }}>
            <Card style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
                <Icon name="scan-line" size={theme.layout.iconSize.xl} color={theme.colors.primaryText} />
                <AppText color="textMuted" align="center">
                  Takıldığın soruyu çek; ipucu al ya da tam çözümü gör.
                </AppText>
              </View>
              <SolveActions stacked />
              {ask}
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
      <Appear>{hero}</Appear>
      <Appear index={1}>
        <SolveActions stacked={false} />
      </Appear>
      <Appear index={2}>{progress}</Appear>
      <Appear index={3}>
        <LeagueCard />
      </Appear>
      <Appear index={4}>{ask}</Appear>
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
  const name = useAuthStore((s) => s.user?.displayName);
  const first = name && name !== 'Sen' ? `, ${name.split(' ')[0]}` : '';
  const today = localToday();
  const left = daysBetween(today, YKS_DATE);
  const eyebrow = upperTr(left > 0 ? `${dayTitle(today)} · YKS'ye ${left} gün` : dayTitle(today));
  return (
    <Screen eyebrow={eyebrow} title={`${greeting(new Date().getHours())}${first}`} titleIcon="logo">
      <HomeContent />
    </Screen>
  );
}
