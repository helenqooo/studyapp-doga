import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useQuestionList } from '../../api/hooks';
import type { Question } from '../../api/types';
import { getTopic, topicLabel } from '../../data/topics';
import { subjectColor, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { PressableScale } from '../motion/PressableScale';
import { QuestionImage } from '../QuestionImage';

// TOKEN-PENDING: layout.thumb.accentEdge = 4 (the subject-ink edge on a recent thumbnail)
const ACCENT_EDGE = 4;
// TOKEN-PENDING: home.recentCount = 3
const RECENT_COUNT = 3;

/** The most recent questions (first page of the history). */
export function useRecentQuestions(count: number): Question[] {
  const list = useQuestionList({});
  return list.data?.pages[0]?.items.slice(0, count) ?? [];
}

function Thumb({ question }: { question: Question }) {
  const theme = useTheme();
  const side = theme.layout.thumb.recent;
  const topic = getTopic(question.topicId);
  return (
    <PressableScale
      kind="card"
      accessibilityRole="button"
      accessibilityLabel={`${topic ? topicLabel(topic) : question.subject} sorusunu aç`}
      onPress={() => router.push(`/question/${question.id}`)}
      style={{
        width: side,
        height: side,
        borderRadius: theme.radius.sm,
        borderCurve: 'continuous',
        overflow: 'hidden',
        // A hairline frame: white question photos would otherwise melt into the white sheet.
        borderWidth: theme.layout.system.borderWidth,
        borderColor: theme.colors.border,
      }}
    >
      <QuestionImage questionId={question.id} size="thumb" style={{ width: '100%', height: '100%' }} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { right: undefined, width: ACCENT_EDGE, backgroundColor: subjectColor(theme, question.subject) }]} />
    </PressableScale>
  );
}

/** "Son çözdüklerin": three thumbnails with a subject edge; `inline` puts the label beside them. */
export function RecentThumbs({ inline = false }: { inline?: boolean }) {
  const theme = useTheme();
  const recent = useRecentQuestions(RECENT_COUNT);
  if (!recent.length) return null;
  return (
    <View style={inline ? { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md } : { gap: theme.spacing.sm }}>
      <AppText variant="label" color="textMuted" style={inline ? { flex: 1 } : undefined}>
        Son çözdüklerin
      </AppText>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {recent.map((q) => (
          <Thumb key={q.id} question={q} />
        ))}
      </View>
    </View>
  );
}
