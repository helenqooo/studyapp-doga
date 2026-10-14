import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useFacets } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Bubble } from '../components/Bubble';
import { Card, ListRow } from '../components/Card';
import { Screen } from '../components/Screen';
import { Section } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Skeleton, SkeletonRows } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/ErrorState';
import { getTopic, SUBJECTS_BY_EXAM, TOPICS, topicLabel, type Exam, type Topic } from '../data/topics';
import { haptics } from '../lib/haptics';
import { useHistoryFilter } from '../store/historyFilter';
import { subjectSoftColor, useTheme, type Theme } from '../theme';

/**
 * A topic row: its name, the question count and an optik bubble that is coded when chosen.
 * A plain function, not a component: `Card divided` runs ListRow children edge to edge.
 */
function topicRow(theme: Theme, key: string, { label, count, selected, onPress }: { label: string; count?: number; selected: boolean; onPress: () => void }) {
  return (
    <ListRow
      key={key}
      title={label}
      chevron={false}
      onPress={onPress}
      accessibilityLabel={`${label}${count !== undefined ? `, ${count} soru` : ''}${selected ? ', seçili' : ''}`}
      trailing={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          {count !== undefined ? (
            <AppText variant="numeric" color="textMuted">
              {count}
            </AppText>
          ) : null}
          <Bubble size="row" filled={selected} verdict={selected ? 'check' : undefined} />
        </View>
      }
    />
  );
}

/** Modal list of topics that have questions, by exam and subject (spec 7.11). */
export default function TopicPickerScreen() {
  const theme = useTheme();
  const { subject, topicId, setTopic, setTopicId } = useHistoryFilter();
  const facets = useFacets();
  const current = getTopic(topicId);
  const [exam, setExam] = useState<Exam>(current?.exam ?? (subject && SUBJECTS_BY_EXAM.AYT.includes(subject as never) ? 'AYT' : 'TYT'));

  const counts = new Map((facets.data?.topics ?? []).map((t) => [t.topicId, t.count]));
  const groups = SUBJECTS_BY_EXAM[exam]
    .map((s) => ({ subject: s, items: TOPICS.filter((t) => t.subject === s && counts.has(t.id)) }))
    .filter((g) => g.items.length > 0);

  const close = () => router.back();
  const chooseAll = () => {
    haptics.select();
    setTopicId(null);
    close();
  };
  const choose = (t: Topic) => {
    haptics.select();
    setTopic(t.subject, t.id);
    close();
  };

  return (
    <Screen
      safeTop={false}
      width="readable"
      title="Konu seç"
      subtitle={subject ? `${subject} sorularını bir konuya göre süz.` : 'Geçmişteki soruları bir konuya göre süz.'}
    >
      <SegmentedControl
        options={[
          { value: 'TYT', label: 'TYT' },
          { value: 'AYT', label: 'AYT' },
        ]}
        value={exam}
        onChange={setExam}
      />

      <Card divided>
        {topicRow(theme, 'all', { label: subject ? `Tüm ${subject} konuları` : 'Tüm konular', selected: !topicId, onPress: chooseAll })}
      </Card>

      {facets.isPending ? (
        <Skeleton>
          <SkeletonRows count={5} />
        </Skeleton>
      ) : null}
      {facets.isError ? <ErrorState error={facets.error} onRetry={() => facets.refetch()} compact /> : null}
      {facets.isSuccess && groups.length === 0 ? (
        <AppText color="textMuted" align="center">
          {exam} derslerinde henüz kayıtlı soru yok.
        </AppText>
      ) : null}

      {groups.map((g) => (
        <Section
          key={g.subject}
          title={g.subject}
          swipe={subjectSoftColor(theme, g.subject)}
          count={g.items.reduce((n, t) => n + (counts.get(t.id) ?? 0), 0)}
        >
          <Card divided>
            {g.items.map((t) => topicRow(theme, t.id, { label: topicLabel(t), count: counts.get(t.id), selected: topicId === t.id, onPress: () => choose(t) }))}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
