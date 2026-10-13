import { View } from 'react-native';
import type { SubjectSummary } from '../api/types';
import { formatNet } from '../lib/format';
import { elevated, subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Sparkline } from './charts/Sparkline';
import { DeltaChip } from './exams/DeltaChip';

/** Stat tile: subject, latest net, change vs previous exam, a sparkline of all nets in the subject's ink. */
export function SubjectTrendTile({ summary, nets }: { summary: SubjectSummary; nets: number[] }) {
  const theme = useTheme();
  const ink = subjectColor(theme, summary.subject);
  const delta = summary.latestNet !== null && summary.previousNet !== null ? summary.latestNet - summary.previousNet : null;

  return (
    <View
      style={{
        flexGrow: 1,
        ...elevated(theme, 'sheet'),
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: ink }} />
        <AppText variant="label" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
          {summary.subject}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <AppText variant="stat">{summary.latestNet === null ? '–' : formatNet(summary.latestNet)}</AppText>
        <AppText variant="caption" color="textMuted">
          / {summary.questions}
        </AppText>
      </View>

      {delta !== null ? (
        <DeltaChip delta={delta} />
      ) : (
        <AppText variant="caption" color="textMuted">
          {summary.count ? 'Karşılaştırma için bir deneme daha gir' : 'Henüz veri yok'}
        </AppText>
      )}

      {nets.length ? <Sparkline values={nets} max={summary.questions} color={ink} /> : null}

      {summary.averageNet !== null && summary.bestNet !== null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.md }}>
          <AppText variant="caption" color="textMuted">
            Ortalama {formatNet(summary.averageNet)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            En iyi {formatNet(summary.bestNet)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
