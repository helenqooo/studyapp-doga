import { router } from 'expo-router';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLeaderboard } from '../../api/hooks';
import type { LeaderboardEntry } from '../../api/types';
import { raceLine } from '../../lib/lumiLines';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { Marked } from './Marked';

// TOKEN-PENDING: layout.miniPodium = { max: 56, min: 14, barWidth: 36 } (Home's "Bu hafta" bars)
const PODIUM = { max: 56, min: 14, barWidth: 36 } as const;

/** Three around the student by rank: the one ahead and behind (or the top three). */
function neighbours(items: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const at = sorted.findIndex((e) => e.isMe);
  const start = Math.max(0, Math.min(at - 1, sorted.length - 3));
  return sorted.slice(start, start + 3);
}

function MiniPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const theme = useTheme();
  const top = Math.max(1, ...entries.map((e) => e.xp));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: theme.spacing.sm }} aria-hidden>
      {entries.map((e) => (
        <View key={e.userId} style={{ alignItems: 'center', gap: theme.spacing.xs, flex: 1 }}>
          <View
            style={{
              width: PODIUM.barWidth,
              height: Math.max(PODIUM.min, Math.round((PODIUM.max * e.xp) / top)),
              borderTopLeftRadius: theme.radius.sm,
              borderTopRightRadius: theme.radius.sm,
              borderCurve: 'continuous',
              backgroundColor: e.isMe ? theme.colors.accent : theme.colors.optikSoft,
            }}
          />
          <AppText variant="caption" color={e.isMe ? 'text' : 'textMuted'} weight={e.isMe ? 'semibold' : undefined} numberOfLines={1}>
            {e.isMe ? 'Sen' : e.displayName.split(' ')[0]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** "Bu hafta 2. sıradasın": a mini podium and the race line, with the gap figure highlighted. */
export function LeagueCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const board = useLeaderboard('week').data;
  const line = raceLine(board);
  if (!line || !board) return null;

  // The race line, with its XP figure lifted out so Lumi can highlight it.
  const m = /(\d+) XP/.exec(line.detail);
  const before = m ? line.detail.slice(0, m.index).trimEnd() : line.detail;
  const after = m ? line.detail.slice(m.index + m[0].length) : '';

  return (
    <Card title={line.title} onPress={() => router.push('/leaderboard')} accessibilityLabel={`${line.title}. ${line.detail} Sıralamayı aç.`} style={style}>
      <MiniPodium entries={neighbours(board.items)} />
      {line.detail ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: theme.spacing.xs }}>
          {before ? <AppText>{before}</AppText> : null}
          {m ? (
            <Marked id="home.lig">
              <AppText variant="numeric">{`${m[1]} XP`}</AppText>
            </Marked>
          ) : null}
          {after ? <AppText style={{ marginLeft: -theme.spacing.xs }}>{after}</AppText> : null}
        </View>
      ) : null}
    </Card>
  );
}
