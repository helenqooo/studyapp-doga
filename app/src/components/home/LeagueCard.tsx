import { View } from 'react-native';
import type { Leaderboard, LeaderboardEntry } from '../../api/types';
import type { raceLine } from '../../lib/lumiLines';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Highlight } from '../Highlight';
import { Icon } from '../Icon';

/** Three around the student by rank: the one ahead and behind (or the top three). */
function neighbours(items: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const at = sorted.findIndex((e) => e.isMe);
  const start = Math.max(0, Math.min(at - 1, sorted.length - 3));
  return sorted.slice(start, start + 3);
}

/** One line of the standing: the rank in an optik bubble (filled for the student), the name, the week's XP. */
function StandingRow({ entry }: { entry: LeaderboardEntry }) {
  const theme = useTheme();
  const me = entry.isMe;
  const name = me ? 'Sen' : entry.displayName.split(' ')[0];
  return (
    <View
      accessible
      accessibilityLabel={`${entry.rank}. ${name}, ${entry.xp} XP`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
      <Bubble size="row" filled={me} animate={false}>
        {String(entry.rank)}
      </Bubble>
      <AppText weight={me ? 'semibold' : undefined} numberOfLines={1} style={{ flex: 1 }}>
        {name}
      </AppText>
      <AppText variant="numeric" color={me ? 'text' : 'textMuted'}>
        {`${entry.xp} XP`}
      </AppText>
    </View>
  );
}

/**
 * "Bu hafta 2. sıradasın": a small standing (the one ahead, the student, the one behind, with
 * their XP) and the race line, its gap figure highlighted for Lumi. The caller makes it a
 * press target into the leaderboard.
 */
export function LeagueSection({ board, race }: { board: Leaderboard; race: NonNullable<ReturnType<typeof raceLine>> }) {
  const theme = useTheme();
  // The race line, with its XP figure lifted out so Lumi can highlight it.
  const m = /(\d+) XP/.exec(race.detail);
  const before = m ? race.detail.slice(0, m.index).trimEnd() : race.detail;
  const after = m ? race.detail.slice(m.index + m[0].length) : '';

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <AppText variant="heading" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {race.title}
        </AppText>
        <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
      </View>
      <View style={{ gap: theme.spacing.xs }}>
        {neighbours(board.items).map((e) => (
          <StandingRow key={e.userId} entry={e} />
        ))}
      </View>
      {race.detail ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: theme.spacing.xs }}>
          {before ? <AppText color="textMuted">{before}</AppText> : null}
          {m ? (
            <Highlight id="home.lig">
              <AppText variant="numeric">{`${m[1]} XP`}</AppText>
            </Highlight>
          ) : null}
          {after ? (
            <AppText color="textMuted" style={{ marginLeft: -theme.spacing.xs }}>
              {after}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
