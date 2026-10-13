import { useState } from 'react';
import { View } from 'react-native';
import { useLeaderboard } from '../api/hooks';
import type { LeaderboardEntry } from '../api/types';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Appear } from '../components/motion/Appear';
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

/** The top three on steps: first in the middle, raised. */
function Podium({ items }: { items: LeaderboardEntry[] }) {
  const theme = useTheme();
  const order = [items[1], items[0], items[2]];
  const step = theme.spacing.xl;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: theme.spacing.md, paddingTop: theme.spacing.md }}>
      {order.map((e, i) => {
        if (!e) return <View key={i} style={{ flex: 1 }} />;
        const first = e.rank === 1;
        const lift = first ? step * 2 : i === 0 ? step : step / 2;
        return (
          <Appear key={e.userId} index={first ? 0 : i === 0 ? 1 : 2} style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
            {first ? <Icon name="crown" size={theme.layout.iconSize.md} color={theme.colors.xp} filled /> : null}
            <Avatar name={e.displayName} color={e.avatar} size={theme.layout.avatar * (first ? 1.6 : 1.3)} />
            <AppText variant="label" weight="semibold" numberOfLines={1}>
              {e.isMe && e.displayName !== 'Sen' ? `${e.displayName} (sen)` : e.displayName}
            </AppText>
            <AppText variant="caption" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
              {e.xp} XP
            </AppText>
            <View
              style={{
                alignSelf: 'stretch',
                height: lift + theme.spacing.lg,
                borderTopLeftRadius: theme.radius.md,
                borderTopRightRadius: theme.radius.md,
                backgroundColor: e.isMe ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                alignItems: 'center',
                paddingTop: theme.spacing.xs,
              }}
            >
              <AppText family="serif" weight="semibold" style={{ fontSize: theme.fontSize.xl }} color={e.isMe ? 'primaryText' : 'textMuted'}>
                {e.rank}
              </AppText>
            </View>
          </Appear>
        );
      })}
    </View>
  );
}

function Row({ e, index }: { e: LeaderboardEntry; index: number }) {
  const theme = useTheme();
  return (
    <Appear index={index}>
      <View
        accessible
        accessibilityLabel={`${e.rank}. ${e.displayName}${e.isMe && e.displayName !== 'Sen' ? ' (sen)' : ''}, ${e.xp} XP, seviye ${e.level}, ${e.streak} günlük seri`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          minHeight: theme.layout.minTouch + theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: e.isMe ? theme.colors.primarySoft : theme.colors.transparent,
        }}
      >
        <AppText variant="heading" color="textMuted" style={{ width: theme.spacing.xl, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {e.rank}
        </AppText>
        <Avatar name={e.displayName} color={e.avatar} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" numberOfLines={1}>
            {e.isMe && e.displayName !== 'Sen' ? `${e.displayName} (sen)` : e.displayName}
          </AppText>
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
        </View>
        <AppText variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
          {e.xp}
          <AppText variant="caption" color="textMuted">
            {' '}
            XP
          </AppText>
        </AppText>
      </View>
    </Appear>
  );
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('week');
  const board = useLeaderboard(period);
  const items = board.data?.items ?? [];
  const me = items.find((e) => e.isMe);

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
      <AppText color="textMuted">
        {period === 'week'
          ? `Haftalık XP. Pazartesi sıfırlanır (${daysToReset()} gün kaldı).`
          : 'Başladığından beri kazanılan toplam XP.'}
        {me ? ` Sen ${me.rank}. sıradasın.` : ''}
      </AppText>

      {board.isPending ? (
        <Skeleton>
          <SkeletonRows count={5} />
        </Skeleton>
      ) : null}
      {board.isError ? <ErrorState error={board.error} onRetry={() => board.refetch()} /> : null}

      {items.length ? (
        <>
          <Podium key={period} items={items.slice(0, 3)} />
          <Card>
            {items.map((e, i) => (
              <Row key={`${period}-${e.userId}`} e={e} index={i} />
            ))}
          </Card>
        </>
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
