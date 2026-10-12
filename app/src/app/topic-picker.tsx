import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useFacets } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { TOPICS, type Topic } from '../data/topics';
import { haptics } from '../lib/haptics';
import { useHistoryFilter } from '../store/historyFilter';
import { useTheme } from '../theme';

function Row({ label, count, selected, onPress }: { label: string; count?: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.layout.minTouch,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: selected ? theme.colors.primarySoft : pressed ? theme.colors.surfaceAlt : theme.colors.surface,
      })}
    >
      <AppText style={{ flex: 1 }} weight={selected ? 'semibold' : undefined}>
        {label}
      </AppText>
      {count !== undefined ? (
        <AppText variant="label" color="textMuted">
          {count}
        </AppText>
      ) : null}
      {selected ? <Icon name="check" size={theme.layout.iconSize.sm} color={theme.colors.primaryText} /> : null}
    </Pressable>
  );
}

/** Modal list of topics (within the selected subject) that have questions. */
export default function TopicPickerScreen() {
  const theme = useTheme();
  const { subject, topicId, setTopicId } = useHistoryFilter();
  const facets = useFacets();

  const counts = new Map((facets.data?.topics ?? []).map((t) => [t.topicId, t.count]));
  const topics = TOPICS.filter((t) => (!subject || t.subject === subject) && counts.has(t.id));

  // Group by `topic` (e.g. "Problemler", "Tarih") keeping taxonomy order.
  const groups: { name: string; items: Topic[] }[] = [];
  for (const t of topics) {
    const group = groups.find((g) => g.name === t.topic);
    if (group) group.items.push(t);
    else groups.push({ name: t.topic, items: [t] });
  }

  const choose = (id: string | null) => {
    haptics.select();
    setTopicId(id);
    router.back();
  };

  return (
    <Screen safeTop={false} width="readable">
      <Row label="Tüm konular" selected={!topicId} onPress={() => choose(null)} />
      {groups.length === 0 && facets.isSuccess ? (
        <AppText color="textMuted" align="center">
          Bu derste henüz kayıtlı soru yok.
        </AppText>
      ) : null}
      {groups.map((g) => (
        <View key={g.name} style={{ gap: theme.spacing.xs }}>
          {g.items.length > 1 || g.items[0]?.subtopic ? (
            <AppText variant="label" color="textMuted" style={{ paddingHorizontal: theme.spacing.md }}>
              {g.name}
            </AppText>
          ) : null}
          {g.items.map((t) => (
            <Row
              key={t.id}
              label={t.subtopic ?? t.topic}
              count={counts.get(t.id)}
              selected={topicId === t.id}
              onPress={() => choose(t.id)}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}
