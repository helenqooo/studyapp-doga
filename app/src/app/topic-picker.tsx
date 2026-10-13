import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFacets } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Bubble } from '../components/Bubble';
import { PressableScale } from '../components/motion/PressableScale';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Skeleton, SkeletonRows } from '../components/states/Skeleton';
import { ErrorState } from '../components/states/ErrorState';
import { getTopic, SUBJECTS_BY_EXAM, TOPICS, topicLabel, type Exam, type Topic } from '../data/topics';
import { haptics } from '../lib/haptics';
import { useHistoryFilter } from '../store/historyFilter';
import { elevated, subjectSoftColor, useTheme } from '../theme';

// TOKEN-PENDING: layout.list.rowHeight = 52 (a picker or settings row)
const ROW_HEIGHT = 52;

function Row({ label, count, selected, onPress }: { label: string; count?: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      kind="row"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count} soru` : label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: ROW_HEIGHT,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {count !== undefined ? (
        <AppText variant="numeric" color="textMuted">
          {count}
        </AppText>
      ) : null}
      <Bubble size="row" filled={selected} verdict={selected ? 'check' : undefined} />
    </PressableScale>
  );
}

/**
 * One inset sheet of rows with optikSoft hairlines between them. The rows' press fill is
 * clipped by an inner layer, so the sheet itself keeps its shadow (as Card does).
 */
function Sheet({ children }: { children: ReactNode[] }) {
  const theme = useTheme();
  const sheet = elevated(theme);
  const inner = Math.max(0, sheet.borderRadius - sheet.borderWidth);
  return (
    <View style={sheet}>
      <View style={{ borderRadius: inner, borderCurve: 'continuous', overflow: 'hidden' }}>
        {children.map((child, i) => (
          <View key={i}>
            {i > 0 ? (
              <View style={{ height: theme.layout.borderWidth, marginLeft: theme.spacing.lg, backgroundColor: theme.colors.optikSoft }} />
            ) : null}
            {child}
          </View>
        ))}
      </View>
    </View>
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
    <Screen safeTop={false} width="readable">
      <SegmentedControl
        options={[
          { value: 'TYT', label: 'TYT' },
          { value: 'AYT', label: 'AYT' },
        ]}
        value={exam}
        onChange={setExam}
      />

      <Sheet>{[<Row key="all" label={subject ? `Tüm ${subject} konuları` : 'Tüm konular'} selected={!topicId} onPress={chooseAll} />]}</Sheet>

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
        <View key={g.subject} style={{ gap: theme.spacing.xs }}>
          <SectionHeader
            title={g.subject}
            swipe={subjectSoftColor(theme, g.subject)}
            count={g.items.reduce((n, t) => n + (counts.get(t.id) ?? 0), 0)}
          />
          <Sheet>
            {g.items.map((t) => (
              <Row key={t.id} label={topicLabel(t)} count={counts.get(t.id)} selected={topicId === t.id} onPress={() => choose(t)} />
            ))}
          </Sheet>
        </View>
      ))}
    </Screen>
  );
}
