import { useTheme } from '../../theme';
import { ProgressBar } from '../ProgressBar';

/**
 * A thin bar under a leaderboard row: this student's XP as a share of the leader's, so
 * the gap reads at a glance. Your own row fills in fosfor, everyone else in optik ink.
 */
export function GapBar({ xp, leaderXp, me = false }: { xp: number; leaderXp: number; me?: boolean }) {
  const theme = useTheme();
  const share = leaderXp > 0 ? xp / leaderXp : 0;
  return (
    <ProgressBar
      variant="plain"
      progress={share}
      height={theme.spacing.xs}
      color={me ? theme.colors.accent : theme.colors.optik}
      trackColor={theme.colors.optikSoft}
    />
  );
}
