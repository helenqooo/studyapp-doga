import { router } from 'expo-router';
import { View } from 'react-native';
import type { Question } from '../api/types';
import { getTopic, topicLabel } from '../data/topics';
import { plainSnippet, reviewDueLabel, shortDate } from '../lib/format';
import { elevated, subjectColor, useTheme, type Theme } from '../theme';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { QuestionImage } from './QuestionImage';
import { PressableScale } from './motion/PressableScale';
import { OptikHistory, lastAttempt, resultLook } from './review/OptikHistory';

export type QuestionRowVariant = 'row' | 'card';

/** The review status as a badge: when it comes back, or that it is learned. */
function dueBadge(theme: Theme, q: Question): { label: string; color?: string; background?: string } | null {
  const review = q.review;
  if (review?.status === 'graduated') return { label: 'Öğrenildi', color: theme.colors.success, background: theme.colors.successSoft };
  if (review?.status !== 'active') return null;
  const when = reviewDueLabel(review.dueDate);
  return when === 'bugün' ? { label: 'Tekrar bugün', color: theme.colors.text, background: theme.colors.hintBackground } : { label: `Tekrar ${when}` };
}

function a11yLabel(q: Question, theme: Theme): string {
  const topic = getTopic(q.topicId);
  const look = resultLook(theme, lastAttempt(q)?.result);
  const due = dueBadge(theme, q);
  return [topic ? topicLabel(topic) : q.subject, q.subject, look.label, due?.label, shortDate(q.createdAt)].filter(Boolean).join(', ');
}

/**
 * A question in the review queue or the history. `row` (default): a compact list row with a
 * thumbnail, the topic, a snippet and the last result. `card`: a sheet with a subject edge,
 * an 88×66 thumbnail, the topic as a heading, a one-line snippet, her last mark on a mini
 * optik strip and the due label as a badge.
 */
export function QuestionRow({ question, variant = 'row' }: { question: Question; variant?: QuestionRowVariant }) {
  const theme = useTheme();
  const topic = getTopic(question.topicId);
  const open = () => router.push(`/question/${question.id}`);
  const due = dueBadge(theme, question);

  if (variant === 'card') {
    const thumb = theme.layout.thumb.card;
    return (
      <Card accent={subjectColor(theme, question.subject)} onPress={open} accessibilityLabel={a11yLabel(question, theme)} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <QuestionImage questionId={question.id} size="thumb" style={{ width: thumb.w, height: thumb.h }} />
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="heading" numberOfLines={1}>
              {topic ? (topic.subtopic ?? topic.topic) : question.subject}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {plainSnippet(question.questionText)}
            </AppText>
            {due ? <Badge label={due.label} color={due.color} background={due.background} style={{ marginTop: theme.spacing.xs }} /> : null}
          </View>
        </View>
        <OptikHistory question={question} />
      </Card>
    );
  }

  const status = resultLook(theme, lastAttempt(question)?.result);
  return (
    <PressableScale
      kind="card"
      accessibilityRole="button"
      accessibilityLabel={a11yLabel(question, theme)}
      onPress={open}
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        ...elevated(theme),
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
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: theme.spacing.md, rowGap: theme.spacing.xxs, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Icon name={status.icon} size={theme.fontSize.sm} color={status.color} />
            <AppText variant="caption" tint={status.color}>
              {status.label}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted">
            {shortDate(question.createdAt)}
          </AppText>
          {due ? (
            <AppText variant="caption" color="textMuted">
              {due.label}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
