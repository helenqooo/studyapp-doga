import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { TopicLoss } from '../../api/types';
import { getTopic, topicLabel } from '../../data/topics';
import { formatNet } from '../../lib/format';
import { useHistoryFilter } from '../../store/historyFilter';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';

const counts = (wrong: number, blank: number) =>
  [wrong ? `${wrong} yanlış` : '', blank ? `${blank} boş` : ''].filter(Boolean).join(', ');

function breakdown(t: TopicLoss): string {
  const parts: string[] = [];
  if (t.examWrong || t.examBlank) parts.push(`Deneme: ${counts(t.examWrong, t.examBlank)}`);
  if (t.practiceWrong || t.practiceBlank) parts.push(`Soru: ${counts(t.practiceWrong, t.practiceBlank)}`);
  return parts.join(' · ');
}

/** The longest bar stops here, leaving room for its value label at the tip. */
const MAX_BAR_SHARE = 0.72;

/**
 * Horizontal bars of nets lost per topic, one hue, value at the bar tip. Tapping a row
 * opens the question history filtered to that topic.
 */
export function TopicLossBars({ items }: { items: TopicLoss[] }) {
  const theme = useTheme();
  const dims = theme.layout.chart;
  const setSubject = useHistoryFilter((s) => s.setSubject);
  const setTopicId = useHistoryFilter((s) => s.setTopicId);
  const maxLost = Math.max(...items.map((t) => t.lostNet), 1);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {items.map((t) => {
        const topic = getTopic(t.topicId);
        const pct = Math.max(0.02, t.lostNet / maxLost);
        return (
          <Pressable
            key={t.topicId}
            accessibilityRole="button"
            accessibilityLabel={`${topic ? topicLabel(topic) : t.topicId}: ${formatNet(t.lostNet)} net kayıp`}
            onPress={() => {
              if (!topic) return;
              setSubject(topic.subject);
              setTopicId(topic.id);
              router.navigate({ pathname: '/review', params: { tab: 'history' } });
            }}
            style={({ pressed }) => ({ gap: theme.spacing.xs, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                {topic ? topicLabel(topic) : t.topicId}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {topic ? `${topic.exam} ${topic.subject}` : ''}
              </AppText>
            </View>
            {/* Square at the baseline, rounded data end, value at the tip. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: `${pct * MAX_BAR_SHARE * 100}%`,
                  height: dims.barThickness,
                  backgroundColor: theme.colors.chart.bar,
                  borderTopRightRadius: dims.barEndRadius,
                  borderBottomRightRadius: dims.barEndRadius,
                }}
              />
              <AppText variant="label" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                {formatNet(t.lostNet)} net
              </AppText>
            </View>
            <AppText variant="caption" color="textMuted">
              {breakdown(t)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
