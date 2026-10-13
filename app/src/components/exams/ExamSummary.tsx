import { View } from 'react-native';
import type { ExamResult } from '../../api/types';
import type { Exam } from '../../data/topics';
import { formatNet, shortDate } from '../../lib/format';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Sparkline } from '../charts/Sparkline';
import { examTitle } from '../ExamCard';
import { DeltaChip } from './DeltaChip';
import { examMax, isComplete, newestFirst } from './examMath';

/** The companion's highlight target on a summary's delta (lumiLines `exam.up`). */
export const summaryTarget = (exam: Exam) => `exams.summary.${exam}`;

/**
 * One exam type at a glance: the last full exam's net (`stat`) out of 120 / 80, the change
 * against the full exam before it (a delta chip the companion can highlight), the best net
 * and a sparkline of every full exam. Branş exams stay out: they would distort the total.
 */
export function ExamSummary({ exam, items }: { exam: Exam; items: readonly ExamResult[] }) {
  const theme = useTheme();
  const full = newestFirst(items.filter((e) => e.exam === exam && isComplete(e)));
  const max = examMax(exam);
  const last = full[0];
  const prev = full[1];
  const best = full.reduce((b, e) => Math.max(b, e.totalNet), -Infinity);

  return (
    <Card style={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Badge label={exam} color={theme.colors.exam[exam].fg} background={theme.colors.exam[exam].bg} />
        {last ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
            {examTitle(last)}, {shortDate(last.date)}
          </AppText>
        ) : null}
      </View>

      {last ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
            <AppText variant="stat">{formatNet(last.totalNet)}</AppText>
            <AppText variant="label" color="textMuted">
              /{max}
            </AppText>
          </View>
          {prev ? (
            <DeltaChip delta={last.totalNet - prev.totalNet} highlightId={summaryTarget(exam)} caption="öncekine göre" />
          ) : (
            <AppText variant="caption" color="textMuted">
              Karşılaştırma için bir {exam} denemesi daha gir.
            </AppText>
          )}
          <View style={{ gap: theme.spacing.xs, marginTop: 'auto' }}>
            {full.length > 1 ? <Sparkline values={full.map((e) => e.totalNet).reverse()} max={max} /> : null}
            <AppText variant="caption" color="textMuted">
              En iyi {formatNet(best)}
            </AppText>
          </View>
        </>
      ) : (
        <AppText color="textMuted">Henüz tam bir {exam} denemesi yok.</AppText>
      )}
    </Card>
  );
}
