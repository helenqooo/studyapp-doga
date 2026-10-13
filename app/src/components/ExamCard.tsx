import { router } from 'expo-router';
import { View } from 'react-native';
import type { ExamResult } from '../api/types';
import { formatNet, shortDate } from '../lib/format';
import { subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { DeltaChip } from './exams/DeltaChip';
import { examMax, isComplete } from './exams/examMath';
import { NetStrip } from './exams/NetStrip';

export function examTitle(e: Pick<ExamResult, 'name' | 'exam'>): string {
  return e.name || `${e.exam} denemesi`;
}

interface Props {
  exam: ExamResult;
  /** The previous full exam of the same type, for the delta chip. */
  previous?: ExamResult | null;
}

/**
 * A karne card: title and date, the net (`stat`) with a delta chip, the net strip (subject
 * inks over an optikSoft track, on the full exam's scale) and the section nets as numeric
 * pairs that never break mid-pair. Fills its grid cell so cards in a row end together.
 */
export function ExamCard({ exam, previous }: Props) {
  const theme = useTheme();
  const full = isComplete(exam);
  return (
    <Card
      onPress={() => router.push({ pathname: '/exam/[id]', params: { id: exam.id } })}
      accessibilityLabel={`${examTitle(exam)}, ${shortDate(exam.date)}, ${formatNet(exam.totalNet)} net`}
      style={{ flexGrow: 1 }}
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="heading" numberOfLines={1}>
          {examTitle(exam)}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {shortDate(exam.date)}
          {full ? '' : `, branş denemesi`}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="stat">{formatNet(exam.totalNet)}</AppText>
          <AppText variant="label" color="textMuted">
            /{exam.totalQuestions}
          </AppText>
        </View>
        {previous ? <DeltaChip delta={exam.totalNet - previous.totalNet} /> : null}
      </View>

      <View style={{ gap: theme.spacing.md, marginTop: 'auto' }}>
        <NetStrip sections={exam.sections} max={examMax(exam.exam)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.lg, rowGap: theme.spacing.xs }}>
          {exam.sections.map((s) => (
            <View key={s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 0 }}>
              <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, s.subject) }} />
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {s.subject}
              </AppText>
              <AppText variant="numeric">{formatNet(s.net)}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
