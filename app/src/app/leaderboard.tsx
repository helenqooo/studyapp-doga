import { useState } from 'react';
import { View } from 'react-native';
import { useLeaderboard } from '../api/hooks';
import type { LeaderboardEntry } from '../api/types';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Highlight } from '../components/Highlight';
import { Icon } from '../components/Icon';
import { GapBar } from '../components/leaderboard/GapBar';
import { Podium, entryName } from '../components/leaderboard/Podium';
import { ErrorState } from '../components/states/ErrorState';
import { Skeleton, SkeletonRows } from '../components/states/Skeleton';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { DEMO_MODE } from '../config';
import { useTheme } from '../theme';

type Period = 'week' | 'all';

/** Days until the weekly board resets (next Monday 00:00, local). */
function daysToReset(): number {
  const dow = new Date().getDay(); // 0 = Sunday
  return dow === 1 ? 7 : (8 - dow) % 7 || 7;
}

/** A row from rank 4 on: rank, avatar, name (yours highlighted), level and streak, XP, and the gap to the leader. */
function Row({ e, leaderXp, last }: { e: LeaderboardEntry; leaderXp: number; last: boolean }) {
  const theme = useTheme();
  const name = (
    <AppText weight="semibold" numberOfLines={1}>
      {entryName(e)}
    </AppText>
  );
  return (
    <View
      accessible
      accessibilityLabel={`${e.rank}. ${entryName(e)}, ${e.xp} XP, seviye ${e.level}, ${e.streak} günlük seri`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.layout.minTouch + theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: last ? 0 : theme.layout.borderWidth,
        borderBottomColor: theme.colors.optikSoft,
      }}
    >
      <AppText variant="numeric" color="textMuted" align="center" style={{ width: theme.spacing.xl }}>
        {e.rank}
      </AppText>
      <Avatar name={e.displayName} color={e.avatar} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flexShrink: 1 }}>{e.isMe ? <Highlight drawn>{name}</Highlight> : name}</View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <AppText variant="caption" color="textMuted">
            Seviye {e.level}
          </AppText>
          {e.streak > 0 ? (
            <>
              <Icon name="flame" size={theme.fontSize.sm} color={theme.colors.streak} filled />
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
  const [period, setPeriod] = useState<Period>('week');
  const board = useLeaderboard(period);
  const items = board.data?.items ?? [];
  const me = items.find((e) => e.isMe);
  const rest = items.slice(3);
  const leaderXp = items[0]?.xp ?? 0;
  const days = daysToReset();

  return (
    <Screen safeTop={false} width="readable">
      <SegmentedControl<Period>
        options={[
          { value: 'week', label: 'Bu hafta' },
          { value: 'all', label: 'Tüm zamanlar' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <AppText variant="caption" color="textMuted">
        {period === 'week' ? `Pazartesi sıfırlanır, ${days} gün kaldı.` : 'Başladığından beri kazanılan toplam XP.'}
        {me ? ` Sen ${me.rank}. sıradasın.` : ''}
      </AppText>

      {board.isPending ? (
        <Skeleton>
          <SkeletonRows count={5} />
        </Skeleton>
      ) : null}
      {board.isError ? <ErrorState error={board.error} onRetry={() => board.refetch()} /> : null}

      {items.length ? <Podium items={items.slice(0, 3)} /> : null}

      {rest.length ? (
        <Card style={{ paddingVertical: theme.spacing.xs, gap: 0 }}>
          {rest.map((e, i) => (
            <Row key={`${period}-${e.userId}`} e={e} leaderXp={leaderXp} last={i === rest.length - 1} />
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
      {DEMO_MODE ? (
        <AppText variant="caption" color="textMuted" align="center">
          Demo: listedeki arkadaşlar örnek.
        </AppText>
      ) : null}
    </Screen>
  );
}
