import { router } from 'expo-router';
import { View } from 'react-native';
import type { ExamResult } from '../api/types';
import { formatNet, shortDate } from '../lib/format';
import { subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { PressableScale } from './motion/PressableScale';

export function examTitle(e: Pick<ExamResult, 'name' | 'exam'>): string {
  return e.name || `${e.exam} denemesi`;
}

/** List row for one deneme: name, date, total net and the per-section nets. */
export function ExamCard({ exam }: { exam: ExamResult }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/exam/${exam.id}`)}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: theme.layout.borderWidth,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Badge label={exam.exam} color={theme.colors.exam[exam.exam].fg} background={theme.colors.exam[exam.exam].bg} />
        <AppText weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
          {examTitle(exam)}
        </AppText>
        <AppText variant="label" color="textMuted">
          {shortDate(exam.date)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
        <AppText variant="title">{formatNet(exam.totalNet)}</AppText>
        <AppText variant="label" color="textMuted">
          net / {exam.totalQuestions}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.md, rowGap: theme.spacing.xs }}>
        {exam.sections.map((s) => (
          <View key={s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <View
              style={{
                width: theme.spacing.sm,
                height: theme.spacing.sm,
                borderRadius: theme.radius.pill,
                backgroundColor: subjectColor(theme, s.subject),
              }}
            />
            <AppText variant="caption" color="textMuted">
              {s.subject} {formatNet(s.net)}
            </AppText>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}
