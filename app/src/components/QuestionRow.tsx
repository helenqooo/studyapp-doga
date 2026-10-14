import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import type { Question } from '../api/types';
import { getTopic, topicLabel } from '../data/topics';
import { daysBetween, localToday, plainSnippet, reviewDueLabel, shortDate } from '../lib/format';
import { elevated, subjectColor, useTheme, type Theme } from '../theme';
import { AppText } from './AppText';
import { ListRow } from './Card';
import { Icon } from './Icon';
import { QuestionImage } from './QuestionImage';
import { PressableScale } from './motion/PressableScale';
import { LastMark, lastAttempt, resultLook } from './review/OptikHistory';

/** How long a list row's snippet runs (it wraps to two lines at most). */
const LIST_SNIPPET = 80;

/** Where a question row sits: the review queue (all due now) or the history (any state). */
export type QuestionRowContext = 'queue' | 'history';

/**
 * When the question comes back, as a short line. In the queue everything is due today, so it
 * only speaks up when one has waited ("4 gündür sırada"); the history names the next review.
 */
function dueLine(theme: Theme, q: Question, context: QuestionRowContext): { text: string; tint: string } | null {
  const review = q.review;
  if (context === 'queue') {
    const late = review ? daysBetween(review.dueDate, localToday()) : 0;
    return late > 0 ? { text: `${late} gündür sırada`, tint: theme.colors.text } : null;
  }
  if (review?.status === 'graduated') return { text: 'Öğrenildi', tint: theme.colors.success };
  if (review?.status !== 'active') return null;
  const when = reviewDueLabel(review.dueDate);
  return { text: `Tekrar ${when}`, tint: when === 'bugün' ? theme.colors.text : theme.colors.textMuted };
}

function a11yLabel(q: Question, theme: Theme, context: QuestionRowContext = 'history'): string {
  const topic = getTopic(q.topicId);
  const look = resultLook(theme, lastAttempt(q)?.result);
  const due = dueLine(theme, q, context);
  return [topic ? topicLabel(topic) : q.subject, q.subject, look.label, due?.text, shortDate(q.createdAt)].filter(Boolean).join(', ');
}

/** The right side of a list row: her last mark, and when it comes back under it. */
function RowMeta({ question, context }: { question: Question; context: QuestionRowContext }) {
  const theme = useTheme();
  const due = dueLine(theme, question, context);
  return (
    <View style={{ alignItems: 'flex-end', gap: theme.spacing.xxs }}>
      <LastMark question={question} />
      {due ? (
        <AppText variant="caption" tint={due.tint} numberOfLines={1}>
          {due.text}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * A question as a `ListRow` for a `<Card divided>` group (spread the result onto ListRow, so
 * the group sees a row): the topic, a short snippet, her last mark and when it comes back.
 * No photo: at row size it can't be read, and the snippet can. `subjectDot` leads with the
 * subject's ink, for lists that aren't grouped by subject. `compact` (a phone) leads the
 * snippet with when it comes back and keeps only her mark at the right, so the topic gets
 * the width.
 */
export function questionRowProps(
  theme: Theme,
  question: Question,
  { context, subjectDot = false, compact = false }: { context: QuestionRowContext; subjectDot?: boolean; compact?: boolean },
): ComponentProps<typeof ListRow> {
  const topic = getTopic(question.topicId);
  const snippet = plainSnippet(question.questionText, LIST_SNIPPET);
  const due = compact ? dueLine(theme, question, context) : null;
  return {
    title: topic ? (topic.subtopic ?? topic.topic) : question.subject,
    detail: due ? `${due.text}. ${snippet}` : snippet,
    leading: subjectDot ? (
      <View
        style={{
          width: theme.spacing.sm + theme.spacing.xxs,
          height: theme.spacing.sm + theme.spacing.xxs,
          borderRadius: theme.radius.pill,
          backgroundColor: subjectColor(theme, question.subject),
        }}
      />
    ) : undefined,
    trailing: compact ? <LastMark question={question} /> : <RowMeta question={question} context={context} />,
    onPress: () => router.push(`/question/${question.id}`),
    accessibilityLabel: a11yLabel(question, theme, context),
  };
}

/** Kept for callers that name it; `row` is the only standalone look. */
export type QuestionRowVariant = 'row';

/**
 * A question as a compact row on the paper (Solve's recent list): a thumbnail, the topic, a
 * snippet and the last result. For a group of questions in one sheet use `questionRowProps`.
 */
export function QuestionRow({ question }: { question: Question; variant?: QuestionRowVariant }) {
  const theme = useTheme();
  const topic = getTopic(question.topicId);
  const open = () => router.push(`/question/${question.id}`);
  const due = dueLine(theme, question, 'history');

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
              {due.text}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
