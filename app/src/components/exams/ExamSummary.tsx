import { View } from 'react-native';
import type { ExamResult } from '../../api/types';
import type { Exam } from '../../data/topics';
import { formatNet, shortDate } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { NetTrendChart } from '../charts/NetTrendChart';
import { examTitle } from '../ExamCard';
import { DeltaChip } from './DeltaChip';
import { examMax, isComplete, newestFirst } from './examMath';

// TOKEN-PENDING: layout.chart.summaryHeight = { compact: 96, tablet: 136 } (the trend under a hero net)
const SUMMARY_CHART = { compact: 96, tablet: 136 };

/** The companion's highlight target on a summary's delta (lumiLines `exam.up`). */
export const summaryTarget = (exam: Exam) => `exams.summary.${exam}`;

/**
 * One exam type at a glance: the last full exam's net (the screen's display numeral) out of
 * 120 / 80, the change against the full exam before it (a delta chip the companion can
 * highlight), the best net and the trend of every full exam with its scale and dates.
 * Branş exams stay out: they would distort the total.
 */
export function ExamSummary({ exam, items }: { exam: Exam; items: readonly ExamResult[] }) {
  const theme = useTheme();
  const { tablet, sheetPadding } = useWindowLayout();
  const full = newestFirst(items.filter((e) => e.exam === exam && isComplete(e)));
  const max = examMax(exam);
  const last = full[0];
  const prev = full[1];
  const best = full.reduce((b, e) => Math.max(b, e.totalNet), -Infinity);
  const trend = [...full].reverse();

  const figures = last ? (
    <>
      <View
        accessible
        accessibilityLabel={`Son ${exam} netin ${formatNet(last.totalNet)}, ${max} soruda`}
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, flexWrap: 'wrap' }}
      >
        {/* The screen's one display numeral (the phone's narrower column takes the stat size). */}
        <AppText variant={tablet ? 'hero' : 'stat'}>{formatNet(last.totalNet)}</AppText>
        <AppText variant="label" color="textMuted">
          /{max} net
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: theme.spacing.md, rowGap: theme.spacing.xs, justifyContent: 'space-between' }}>
        {prev ? (
          // Phone: the caption goes under the chip, clear of the chart's scale beside the column.
          <DeltaChip delta={last.totalNet - prev.totalNet} highlightId={summaryTarget(exam)} caption="öncekine göre" captionBelow={!tablet} />
        ) : (
          <AppText variant="caption" color="textMuted">
            Karşılaştırma için bir {exam} denemesi daha gir.
          </AppText>
        )}
        {full.length > 1 ? (
          <AppText variant="caption" color="textMuted">
            En iyi {formatNet(best)}
          </AppText>
        ) : null}
      </View>
    </>
  ) : (
    <AppText color="textMuted">Henüz tam bir {exam} denemesi yok.</AppText>
  );

  const chart =
    trend.length > 1 ? (
      <NetTrendChart
        mode="summary"
        max={max}
        height={tablet ? SUMMARY_CHART.tablet : SUMMARY_CHART.compact}
        data={trend.map((t) => ({ key: t.id, date: t.date, label: examTitle(t), value: t.totalNet }))}
      />
    ) : null;

  return (
    <View style={{ flex: 1, minWidth: 0, padding: sheetPadding, gap: tablet ? theme.spacing.md : theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Badge label={exam} color={theme.colors.exam[exam].fg} background={theme.colors.exam[exam].bg} />
        {last ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
            {examTitle(last)}, {shortDate(last.date)}
          </AppText>
        ) : null}
      </View>
      {tablet ? (
        <>
          {figures}
          {chart ? <View style={{ marginTop: 'auto' }}>{chart}</View> : null}
        </>
      ) : (
        // Phone: the figures and their trend side by side, so both exams fit one screen.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>{figures}</View>
          {chart ? <View style={{ flex: 1 }}>{chart}</View> : null}
        </View>
      )}
    </View>
  );
}

/** The exams screen's primary sheet: TYT and AYT side by side, split by an optik hairline. */
export function ExamHero({ exams, items }: { exams: Exam[]; items: readonly ExamResult[] }) {
  const theme = useTheme();
  const { tablet, sheetPadding } = useWindowLayout();
  // iPad: the two halves side by side; phone: one above the other.
  const hairline = tablet
    ? { width: theme.layout.borderWidth, marginVertical: sheetPadding }
    : { height: theme.layout.borderWidth, marginHorizontal: sheetPadding };
  return (
    <Card variant="hero" style={{ padding: 0, gap: 0, flexDirection: tablet ? 'row' : 'column' }}>
      {exams.map((x, i) => (
        <View key={x} style={{ flex: tablet ? 1 : undefined, flexDirection: tablet ? 'row' : 'column', minWidth: 0 }}>
          {i > 0 ? <View style={{ ...hairline, backgroundColor: theme.colors.optikSoft }} /> : null}
          <ExamSummary exam={x} items={items} />
        </View>
      ))}
    </Card>
  );
}
