import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useLeaderboard } from '../api/hooks';
import type { LeaderboardEntry } from '../api/types';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Col, Row } from '../components/Grid';
import { Highlight } from '../components/Highlight';
import { Icon } from '../components/Icon';
import { GapBar } from '../components/leaderboard/GapBar';
import { Podium, entryName } from '../components/leaderboard/Podium';
import { ErrorState } from '../components/states/ErrorState';
import { Skeleton, SkeletonRows } from '../components/states/Skeleton';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { DEMO_MODE } from '../config';
import { useFontScale, useWindowLayout } from '../lib/layout';
import { useTheme } from '../theme';


type Period = 'week' | 'all';

/** Days until the weekly board resets (next Monday 00:00, local). */
function daysToReset(): number {
  const dow = new Date().getDay(); // 0 = Sunday
  return dow === 1 ? 7 : (8 - dow) % 7 || 7;
}

/**
 * A row from rank 4 on, inside the divided sheet: rank, avatar (yours ringed), the name (yours
 * with a highlighter swipe), level and streak, the gap to the leader as a thin bar, and the XP.
 */
function RankRow({ e, leaderXp }: { e: LeaderboardEntry; leaderXp: number }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const type = useFontScale();
  const name = (
    <AppText weight="semibold" numberOfLines={1}>
      {entryName(e)}
    </AppText>
  );
  return (
    <View
      accessible
      accessibilityLabel={`${e.rank}. ${entryName(e)}, ${e.xp} XP, seviye ${e.level}, ${e.streak} günlük seri`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
      <AppText variant="numeric" color="textMuted" align="center" style={{ width: theme.spacing.xl }}>
        {e.rank}
      </AppText>
      <Avatar name={e.displayName} color={e.avatar} size={tablet ? theme.layout.leaderboard.rowAvatar.tablet : theme.layout.leaderboard.rowAvatar.compact} ring={e.isMe ? theme.colors.accent : undefined} />
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexShrink: 1 }}>{e.isMe ? <Highlight drawn>{name}</Highlight> : name}</View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <AppText variant="caption" color="textMuted">
            Seviye {e.level}
          </AppText>
          {e.streak > 0 ? (
            <>
              <Icon name="flame" size={type.sm} color={theme.colors.streak} filled />
              <AppText variant="caption" color="textMuted">
                {e.streak} gün
              </AppText>
            </>
          ) : null}
        </View>
        <GapBar xp={e.xp} leaderXp={leaderXp} me={e.isMe} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
        <AppText variant="numeric">{e.xp}</AppText>
        <AppText variant="caption" color="textMuted">
          XP
        </AppText>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const wide = sizeClass === 'wide';
  const [period, setPeriod] = useState<Period>('week');
  const board = useLeaderboard(period);
  const items = board.data?.items ?? [];
  const me = items.find((e) => e.isMe);
  const rest = items.slice(3);
  const leaderXp = items[0]?.xp ?? 0;
  const days = daysToReset();

  const subtitle = me
    ? period === 'week'
      ? `Bu hafta ${me.rank}. sıradasın.`
      : `Tüm zamanlarda ${me.rank}. sıradasın.`
    : 'Arkadaşlarınla XP yarışı.';

  const segments = (
    <SegmentedControl<Period>
      options={[
        { value: 'week', label: 'Bu hafta' },
        { value: 'all', label: 'Tüm zamanlar' },
      ]}
      value={period}
      onChange={setPeriod}
    />
  );
  const note = (
    <AppText variant="caption" color="textMuted">
      {period === 'week' ? `Pazartesi sıfırlanır, ${days} gün kaldı.` : 'Başladığından beri kazanılan toplam XP.'}
    </AppText>
  );
  const states = (
    <>
      {board.isPending ? (
        <Skeleton>
          <SkeletonRows count={5} />
        </Skeleton>
      ) : null}
      {board.isError ? <ErrorState error={board.error} onRetry={() => board.refetch()} /> : null}
    </>
  );
  const podium = items.length ? <Podium items={items.slice(0, 3)} /> : null;
  const list = (
    <>
      {rest.length ? (
        <Card divided>
          {rest.map((e) => (
            <RankRow key={`${period}-${e.userId}`} e={e} leaderXp={leaderXp} />
          ))}
        </Card>
      ) : null}
      {items.length === 1 ? (
        <Card background={theme.colors.hintBackground}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Icon name="users" color={theme.colors.warning} />
            <AppText style={{ flex: 1 }}>
              Sıralama arkadaşlarınla güzel. Sunucudaki davet kodunu (INVITE_CODE) paylaş; onlar da hesap açınca burada görünürler.
            </AppText>
          </View>
        </Card>
      ) : null}
    </>
  );
  const demo = DEMO_MODE ? (
    <AppText variant="caption" color="textMuted" align={wide ? 'left' : 'center'}>
      Demo: listedeki arkadaşlar örnek.
    </AppText>
  ) : null;

  // Landscape, 7/5 on the dashboard width: the podium (the primary) and its period switch on the
  // left, the ranked list and when it resets on the right. Portrait and phone keep one readable column.
  let body: ReactNode;
  if (wide) {
    body = (
      <>
        {states}
        <Row>
          <Col span={{ compact: 4, wide: 7 }}>
            {segments}
            {podium}
          </Col>
          <Col span={{ compact: 4, wide: 5 }} style={{ gap: theme.spacing.sm }}>
            {list}
            {note}
            {demo}
          </Col>
        </Row>
      </>
    );
  } else {
    body = (
      <>
        <View style={{ gap: theme.spacing.sm }}>
          {segments}
          {note}
        </View>
        {states}
        {podium}
        {list}
        {demo}
      </>
    );
  }

  return (
    <Screen safeTop={false} width={wide ? 'dashboard' : 'readable'} title="Sıralama" subtitle={subtitle}>
      {body}
    </Screen>
  );
}
