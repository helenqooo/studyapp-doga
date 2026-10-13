import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useFacets, useQuestionList, useReviewsToday } from '../../api/hooks';
import type { AttemptResult, Question } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Col, Grid, Row } from '../../components/Grid';
import { Highlight } from '../../components/Highlight';
import { Appear } from '../../components/motion/Appear';
import { Odometer } from '../../components/motion/Odometer';
import { QuestionRow } from '../../components/QuestionRow';
import { Merdiven, ladderCounts } from '../../components/review/Merdiven';
import { lastAttempt } from '../../components/review/OptikHistory';
import { ResultMeter } from '../../components/review/ResultMeter';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { Skeleton, SkeletonCard, SkeletonRows } from '../../components/states/Skeleton';
import { getTopic, SUBJECTS_BY_EXAM, topicLabel, type Exam } from '../../data/topics';
import { useWindowLayout } from '../../lib/layout';
import { useHistoryFilter } from '../../store/historyFilter';
import { subjectColor, subjectSoftColor, useTheme } from '../../theme';

// TOKEN-PENDING: layout.cta.minWidth = 240 (an auto-width lg primary never gets narrower)
const CTA_MIN_WIDTH = 240;
// TOKEN-PENDING: layout.segmented.maxWidth = 360 (a two-option segmented control on a dashboard)
const SEGMENT_MAX_WIDTH = 360;
// TOKEN-PENDING: layout.chipRowLabel = 40 (the "TYT" / "AYT" label column before a chip row)
const CHIP_ROW_LABEL = 40;
/** About how long one review question takes (minutes), for "Yaklaşık 6 dakika". */
const MINUTES_PER_REVIEW = 1.2;

type Tab = 'today' | 'history';

/** Due questions grouped by subject, in queue order (oldest due first). */
function bySubject(items: Question[]): { subject: string; items: Question[] }[] {
  const groups: { subject: string; items: Question[] }[] = [];
  for (const q of items) {
    const g = groups.find((x) => x.subject === q.subject);
    if (g) g.items.push(q);
    else groups.push({ subject: q.subject, items: [q] });
  }
  return groups;
}

/** The session sheet: the count Lumi highlights, the ladder and the one primary on the page. */
function SessionSheet({ items }: { items: Question[] }) {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const rungs = theme.layout.ladder.rungs;
  const count = items.length;
  const minutes = Math.max(1, Math.round(count * MINUTES_PER_REVIEW));
  // Tablet portrait lays the sheet out sideways: count | ladder | button.
  const sideways = sizeClass === 'regular';

  const countBlock = (
    <View style={{ gap: theme.spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
        <Odometer value={count} variant="hero" cacheKey="review.count" accessibilityLabel={`${count} soru bekliyor`} />
        <View style={{ paddingBottom: theme.spacing.sm }}>
          <Highlight id="review.count">
            <AppText variant="heading" numberOfLines={1}>
              soru bekliyor
            </AppText>
          </Highlight>
        </View>
      </View>
      <AppText variant="caption" color="textMuted">
        Yaklaşık {minutes} dakika
      </AppText>
    </View>
  );

  const ladder = (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label" color="textMuted">
        Tekrar merdiveni
      </AppText>
      <Merdiven counts={ladderCounts(items, rungs)} />
    </View>
  );

  const start = (
    <Button
      label="Tekrara başla"
      icon="play"
      size="lg"
      onPress={() => router.push('/review-session')}
      style={{ alignSelf: sideways ? 'center' : 'flex-start', minWidth: CTA_MIN_WIDTH }}
    />
  );

  return (
    <Card variant="hero">
      {sideways ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl }}>
          {countBlock}
          <View style={{ flex: 1 }}>{ladder}</View>
          {start}
        </View>
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          {countBlock}
          {start}
          {ladder}
        </View>
      )}
    </Card>
  );
}

function TodayPanel() {
  const theme = useTheme();
  const today = useReviewsToday();
  const { refetch } = today;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (today.isPending) {
    return (
      <Skeleton>
        <SkeletonCard lines={3} block={theme.layout.thumb.card.h} />
        <SkeletonRows count={3} />
      </Skeleton>
    );
  }
  if (today.isError) return <ErrorState error={today.error} onRetry={() => today.refetch()} />;

  const { items, completedToday } = today.data;

  if (!items.length) {
    return (
      <EmptyState mood={completedToday ? 'celebrate' : 'wave'} title="Bugünlük tekrar yok.">
        {completedToday
          ? `Bugün ${completedToday} tekrar yaptın. Yeni bir soru çözersen listeye eklerim.`
          : 'Yeni bir soru çözersen listeye eklerim.'}
      </EmptyState>
    );
  }

  return (
    <Row gap={theme.spacing.xl}>
      <Col span={{ compact: 4, regular: 8, wide: 5 }}>
        <SessionSheet items={items} />
      </Col>
      <Col span={{ compact: 4, regular: 8, wide: 7 }}>
        {/* The subject groups sit right under "Sıradakiler" (no column gap between the two
            44 pt headers), each group closer to its cards than to the group before it. */}
        <View>
          <SectionHeader title="Sıradakiler" count={items.length} />
          <View style={{ gap: theme.spacing.lg }}>
            {bySubject(items).map((g) => (
              <View key={g.subject} style={{ gap: theme.spacing.sm }}>
                <SectionHeader title={g.subject} swipe={subjectSoftColor(theme, g.subject)} count={g.items.length} />
                <Grid columns={{ compact: 1, regular: 2 }}>
                  {g.items.map((q) => (
                    <QuestionRow key={q.id} question={q} variant="card" />
                  ))}
                </Grid>
              </View>
            ))}
          </View>
        </View>
      </Col>
    </Row>
  );
}

/** "Bu hafta" / "Geçen hafta" / "Daha önce", by when the question was saved (weeks start on Monday). */
function byWeek(items: Question[]): { title: string; items: Question[] }[] {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
  const sections = [
    { title: 'Bu hafta', from: monday.getTime(), items: [] as Question[] },
    { title: 'Geçen hafta', from: lastMonday.getTime(), items: [] as Question[] },
    { title: 'Daha önce', from: -Infinity, items: [] as Question[] },
  ];
  for (const q of items) {
    const t = new Date(q.createdAt).getTime();
    sections.find((s) => t >= s.from)!.items.push(q);
  }
  return sections.filter((s) => s.items.length);
}

/**
 * Wraps grid items in a staggered entrance only after a skeleton or a filter change (spec 5.3).
 * The Appear fills its grid cell (Grid only stretches a direct Appear child), so cards in a
 * row keep the same height while they stagger in.
 */
function Cell({ animate, index, children }: { animate: boolean; index: number; children: ReactNode }) {
  return animate ? (
    <Appear index={index} style={{ flex: 1 }}>
      {children}
    </Appear>
  ) : (
    <>{children}</>
  );
}

function SubjectChips({ exam, counts, subject, onPick }: { exam: Exam; counts: Map<string, number>; subject: string | null; onPick: (s: string) => void }) {
  const theme = useTheme();
  const subjects = SUBJECTS_BY_EXAM[exam].filter((s) => counts.has(s));
  if (!subjects.length) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <AppText variant="label" color="textMuted" style={{ width: CHIP_ROW_LABEL }}>
        {exam}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: theme.spacing.sm }}>
        {subjects.map((s) => (
          <Chip
            key={s}
            label={`${s} (${counts.get(s)})`}
            selected={subject === s}
            color={subjectColor(theme, s)}
            onPress={() => onPick(s)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function HistoryPanel() {
  const theme = useTheme();
  const { subject, topicId, setSubject } = useHistoryFilter();
  const facets = useFacets();
  const list = useQuestionList({ subject, topicId });

  // Stagger the grid only when it replaces a skeleton or the filter changed, never on a revisit.
  const [stagger, setStagger] = useState(list.isPending);
  const filterKey = `${subject}|${topicId}`;
  const seenFilter = useRef(filterKey);
  useEffect(() => {
    if (seenFilter.current !== filterKey) {
      seenFilter.current = filterKey;
      setStagger(true);
    }
  }, [filterKey]);
  useEffect(() => {
    if (list.isPending) setStagger(true);
  }, [list.isPending]);

  const subjectCounts = new Map((facets.data?.subjects ?? []).map((s) => [s.subject, s.count]));
  const topic = getTopic(topicId);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;

  const tally: Record<AttemptResult, number> = { correct: 0, wrong: 0, blank: 0 };
  for (const q of items) {
    const r = lastAttempt(q)?.result;
    if (r) tally[r] += 1;
  }

  const pick = (s: string) => setSubject(subject === s ? null : s);
  const filtered = !!(subject || topicId);

  const filters = (
    <View style={{ gap: theme.spacing.sm }}>
      <SubjectChips exam="TYT" counts={subjectCounts} subject={subject} onPick={pick} />
      <SubjectChips exam="AYT" counts={subjectCounts} subject={subject} onPick={pick} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
        <Button
          label={topic ? `Konu: ${topicLabel(topic)}` : 'Konu: Tümü'}
          icon="list-filter"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/topic-picker')}
          style={{ flexShrink: 1 }}
        />
        {filtered ? <Button label="Filtreyi temizle" icon="x" variant="ghost" size="sm" onPress={() => setSubject(null)} /> : null}
      </View>
    </View>
  );

  const summary = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
        <AppText variant="stat">{total}</AppText>
        <AppText variant="label" color="textMuted">
          {filtered ? 'soru bu filtrede' : 'soru kaydettin'}
        </AppText>
      </View>
      <ResultMeter correct={tally.correct} wrong={tally.wrong} blank={tally.blank} />
    </Card>
  );

  let index = 0;
  return (
    <>
      <Row gap={theme.spacing.lg}>
        <Col span={{ compact: 4, regular: 8, wide: 7 }}>{filters}</Col>
        <Col span={{ compact: 4, regular: 8, wide: 5 }}>{list.isSuccess && total ? summary : null}</Col>
      </Row>

      {list.isPending ? (
        <Skeleton>
          <SkeletonRows count={4} />
        </Skeleton>
      ) : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}

      {list.isSuccess && items.length === 0 ? (
        filtered ? (
          <AppText color="textMuted" align="center">
            Bu filtrede soru yok.
          </AppText>
        ) : (
          <EmptyState mood="study" title="Henüz soru yok.">
            Takıldığın ilk soruyu Çöz sekmesinden çek; yanlışların burada tekrar sırasına girer.
          </EmptyState>
        )
      ) : null}

      {byWeek(items).map((section) => (
        <View key={section.title} style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={section.title} count={section.items.length} />
          <Grid columns={{ compact: 1, regular: 2, wide: 3 }}>
            {section.items.map((q) => (
              <Cell key={q.id} animate={stagger} index={index++}>
                <QuestionRow question={q} variant="card" />
              </Cell>
            ))}
          </Grid>
        </View>
      ))}

      {list.hasNextPage ? (
        <Button
          label="Daha fazla göster"
          icon="chevron-down"
          variant="ghost"
          loading={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </>
  );
}

export default function ReviewScreen() {
  // Other screens can open the history directly (e.g. a tapped topic in Analiz).
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'today');
  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);
  return (
    <Screen title="Tekrar">
      <View style={{ width: '100%', maxWidth: SEGMENT_MAX_WIDTH }}>
        <SegmentedControl
          options={[
            { value: 'today', label: 'Bugün' },
            { value: 'history', label: 'Geçmiş' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {tab === 'today' ? <TodayPanel /> : <HistoryPanel />}
    </Screen>
  );
}
