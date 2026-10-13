import { View } from 'react-native';
import type { SubjectSummary } from '../api/types';
import { formatDelta, formatNet } from '../lib/format';
import { subjectColor, useTheme, elevated } from '../theme';
import { AppText } from './AppText';
import { Sparkline } from './charts/Sparkline';
import { Icon } from './Icon';

/** Stat tile: subject, latest net, change vs previous exam, sparkline of all nets. */
export function SubjectTrendTile({ summary, nets }: { summary: SubjectSummary; nets: number[] }) {
  const theme = useTheme();
  const delta = summary.latestNet !== null && summary.previousNet !== null ? summary.latestNet - summary.previousNet : null;
  const up = delta !== null && delta > 0.005;
  const down = delta !== null && delta < -0.005;

  return (
    <View
      style={{
        flex: 1,
        ...elevated(theme),
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <View
          style={{
            width: theme.spacing.sm,
            height: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            backgroundColor: subjectColor(theme, summary.subject),
          }}
        />
        <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
          {summary.subject}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
        <AppText variant="title">{summary.latestNet === null ? '—' : formatNet(summary.latestNet)}</AppText>
        <AppText variant="caption" color="textMuted">
          / {summary.questions}
        </AppText>
      </View>

      {delta !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
          <Icon
            name={up ? 'arrow-up-right' : down ? 'arrow-down-right' : 'arrow-right'}
            size={theme.fontSize.sm}
            color={up ? theme.colors.success : down ? theme.colors.danger : theme.colors.textMuted}
          />
          <AppText variant="caption" color="textMuted">
            {formatDelta(delta)} öncekine göre
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color="textMuted">
          {summary.count ? 'Karşılaştırma için bir deneme daha gir' : 'Henüz veri yok'}
        </AppText>
      )}

      {nets.length ? <Sparkline values={nets} max={summary.questions} /> : null}

      {summary.averageNet !== null && summary.bestNet !== null ? (
        <AppText variant="caption" color="textMuted">
          Ort. {formatNet(summary.averageNet)} · En iyi {formatNet(summary.bestNet)}
        </AppText>
      ) : null}
    </View>
  );
}
