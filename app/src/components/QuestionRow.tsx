import { router } from 'expo-router';
import { View } from 'react-native';
import type { AttemptResult, Question } from '../api/types';
import { getTopic, topicLabel } from '../data/topics';
import { plainSnippet, reviewDueLabel, shortDate } from '../lib/format';
import { subjectColor, useTheme, type Theme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { QuestionImage } from './QuestionImage';
import { PressableScale } from './motion/PressableScale';

function resultIcon(theme: Theme, result: AttemptResult | undefined): { icon: IconName; color: string; label: string } {
  switch (result) {
    case 'correct':
      return { icon: 'circle-check', color: theme.colors.success, label: 'Doğru' };
    case 'wrong':
      return { icon: 'circle-x', color: theme.colors.danger, label: 'Yanlış' };
    case 'blank':
      return { icon: 'circle-minus', color: theme.colors.neutral, label: 'Boş' };
    default:
      return { icon: 'circle-dashed', color: theme.colors.textMuted, label: 'İşaretlenmedi' };
  }
}

/** History / queue list row: thumbnail, subject + topic, snippet, last result and review status. */
export function QuestionRow({ question }: { question: Question }) {
  const theme = useTheme();
  const topic = getTopic(question.topicId);
  const last = question.attempts[question.attempts.length - 1];
  const status = resultIcon(theme, last?.result);
  const review = question.review;

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/question/${question.id}`)}
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.layout.borderWidth,
        borderColor: theme.colors.border,
      }}
    >
      <QuestionImage questionId={question.id} size="thumb" />
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <View
            style={{
              width: theme.spacing.sm,
              height: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              backgroundColor: subjectColor(theme, question.subject),
            }}
          />
          <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {topic ? topicLabel(topic) : question.subject}
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted" numberOfLines={2}>
          {plainSnippet(question.questionText)}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
          <Icon name={status.icon} size={theme.fontSize.sm} color={status.color} />
          <AppText variant="caption" tint={status.color}>
            {status.label}
          </AppText>
          <AppText variant="caption" color="textMuted">
            · {shortDate(question.createdAt)}
            {review?.status === 'active' ? ` · Tekrar ${reviewDueLabel(review.dueDate)}` : ''}
            {review?.status === 'graduated' ? ' · Öğrenildi' : ''}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}
