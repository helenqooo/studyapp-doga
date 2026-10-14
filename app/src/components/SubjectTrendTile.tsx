import { Fragment } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { SubjectSummary } from '../api/types';
import { formatNet } from '../lib/format';
import { useWindowLayout } from '../lib/layout';
import { subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Sparkline } from './charts/Sparkline';
import { DeltaChip } from './exams/DeltaChip';

/**
 * One subject: name, latest net, change vs previous exam, a sparkline of all nets in the
 * subject's ink, then its average and best on two lines. Set in a `SubjectTiles` sheet.
 */
export function SubjectTrendTile({ summary, nets }: { summary: SubjectSummary; nets: number[] }) {
  const theme = useTheme();
  const ink = subjectColor(theme, summary.subject);
  const delta = summary.latestNet !== null && summary.previousNet !== null ? summary.latestNet - summary.previousNet : null;

  return (
    <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: ink }} />
        <AppText variant="label" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
          {summary.subject}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <AppText variant="stat">{summary.latestNet === null ? '–' : formatNet(summary.latestNet)}</AppText>
        <AppText variant="caption" color="textMuted">
          /{summary.questions}
        </AppText>
      </View>

      {delta !== null ? (
        <DeltaChip delta={delta} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <AppText variant="caption" color="textMuted">
          {summary.count ? 'Karşılaştırma için bir deneme daha gir' : 'Henüz veri yok'}
        </AppText>
      )}

      {nets.length ? <Sparkline values={nets} max={summary.questions} color={ink} /> : null}

      {summary.averageNet !== null && summary.bestNet !== null ? (
        <View style={{ marginTop: 'auto' }}>
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

/**
 * The subject tiles of one exam type in a single sheet, two across (four would cut "Temel
 * Matematik" on an iPad in portrait), split by optik hairlines (no sheet per tile).
 */
export function SubjectTiles({ title, tiles, style }: { title: string; tiles: { summary: SubjectSummary; nets: number[] }[]; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { sheetPadding } = useWindowLayout();
  const n = 2;
  const rows: (typeof tiles)[] = [];
  for (let i = 0; i < tiles.length; i += n) rows.push(tiles.slice(i, i + n));
  const hairline = theme.colors.optikSoft;
  return (
    <Card title={title} style={[{ gap: theme.spacing.xs }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={[{ flexDirection: 'row' }, r > 0 ? { borderTopWidth: theme.layout.borderWidth, borderColor: hairline } : null]}>
          {row.map((t, i) => (
            <Fragment key={t.summary.subject}>
              {i > 0 ? <View style={{ width: theme.layout.borderWidth, backgroundColor: hairline }} /> : null}
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  paddingLeft: i === 0 ? 0 : sheetPadding,
                  paddingRight: i === row.length - 1 ? 0 : sheetPadding,
                  paddingTop: r === 0 ? theme.spacing.sm : sheetPadding,
                  paddingBottom: r === rows.length - 1 ? 0 : sheetPadding,
                }}
              >
                <SubjectTrendTile summary={t.summary} nets={t.nets} />
              </View>
            </Fragment>
          ))}
          {Array.from({ length: n - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </Card>
  );
}
