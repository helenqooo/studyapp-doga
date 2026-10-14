import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useFacets, useQuestionList, useReviewsToday } from '../../api/hooks';
import type { AttemptResult, Question } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card, GroupDivider, ListRow } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Col, Row } from '../../components/Grid';
import { Highlight } from '../../components/Highlight';
import { Appear } from '../../components/motion/Appear';
import { Odometer } from '../../components/motion/Odometer';
import { questionRowProps } from '../../components/QuestionRow';
import { Merdiven, ladderCounts } from '../../components/review/Merdiven';
import { lastAttempt } from '../../components/review/OptikHistory';
import { ResultMeter } from '../../components/review/ResultMeter';
import { Screen } from '../../components/Screen';
import { Section } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { Skeleton, SkeletonCard, SkeletonRows } from '../../components/states/Skeleton';
import { getTopic, SUBJECTS_BY_EXAM, topicLabel, type Exam } from '../../data/topics';
import { useContentSize, useWindowLayout } from '../../lib/layout';
import { useHistoryFilter } from '../../store/historyFilter';
import { subjectColor, useTheme } from '../../theme';

// TOKEN-PENDING: layout.cta.minWidth = 240 (an auto-width lg primary never gets narrower)
const CTA_MIN_WIDTH = 240;
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

/**
 * The session sheet, the one primary on the page: the count Lumi highlights and "Tekrara
 * başla" on top, the ladder on its own row under a hairline (so its rungs never squeeze).
 * Tablet portrait puts the count and the button side by side.
 */
function SessionSheet({ items }: { items: Question[] }) {
  const theme = useTheme();
  const { sizeClass, tablet } = useWindowLayout();
  const rungs = theme.layout.ladder.rungs;
  const count = items.length;
  const minutes = Math.max(1, Math.round(count * MINUTES_PER_REVIEW));
  const sideways = sizeClass === 'regular';
  const gap = tablet ? theme.spacing.xl : theme.spacing.lg;

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
      <AppText variant="label" color="textMuted">
        Yaklaşık {minutes} dakika
      </AppText>
    </View>
  );

  const start = (
    <Button
      label="Tekrara başla"
      icon="play"
      size="lg"
      onPress={() => router.push('/review-session')}
      style={sideways ? { minWidth: CTA_MIN_WIDTH } : { alignSelf: 'stretch' }}
    />
  );

  return (
    <Card variant="hero">
      <View style={{ gap }}>
        <View
          style={
            sideways
              ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.lg }
              : { gap }
          }
        >
          {countBlock}
          {start}
        </View>
        <GroupDivider inset={0} />
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xxs }}>
            <AppText variant="label" weight="semibold">
              Tekrar merdiveni
            </AppText>
            <AppText variant="caption" color="textMuted">
              Her doğru, soruyu bir basamak yukarı taşır.
            </AppText>
          </View>
          <Merdiven counts={ladderCounts(items, rungs)} />
        </View>
      </View>
    </Card>
  );
}

/** A subject's name over its group: its ink as a dot, then the count. */
function SubjectLabel({ subject, count }: { subject: string; count: number }) {
  const theme = useTheme();
  const dot = theme.spacing.sm + theme.spacing.xxs;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View style={{ width: dot, height: dot, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, subject) }} />
      <AppText variant="label" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {subject}
      </AppText>
      <AppText variant="label" color="textMuted" tabular>
        {count}
      </AppText>
    </View>
  );
}

function TodayPanel() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const today = useReviewsToday();
  const { refetch } = today;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // The skeleton takes the page's shape (sheet beside the list in landscape), so nothing jumps.
  if (today.isPending) {
    return (
      <Skeleton>
        <Row gap={theme.spacing.xl}>
          <Col span={{ compact: 4, regular: 8, wide: 5 }}>
            <SkeletonCard lines={3} block={theme.layout.thumb.card.h} />
          </Col>
          <Col span={{ compact: 4, regular: 8, wide: 7 }}>
            <SkeletonRows count={3} />
          </Col>
        </Row>
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
        {/* The queue: one quiet list per subject, oldest due first. */}
        <Section title="Sıradakiler" count={items.length}>
          <View style={{ gap: tablet ? theme.spacing.xl : theme.spacing.lg }}>
            {bySubject(items).map((g) => (
              <View key={g.subject} style={{ gap: theme.spacing.sm }}>
                <SubjectLabel subject={g.subject} count={g.items.length} />
                <Card divided>
                  {g.items.map((q) => (
                    <ListRow key={q.id} {...questionRowProps(theme, q, { context: 'queue', compact: !tablet })} />
                  ))}
                </Card>
              </View>
            ))}
          </View>
        </Section>
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

/** Staggers a week's list in only after a skeleton or a filter change (spec 5.3). */
function Stagger({ animate, index, children }: { animate: boolean; index: number; children: ReactNode }) {
  return animate ? <Appear index={index}>{children}</Appear> : <>{children}</>;
}

/**
 * One exam's subject chips with its label. On a phone they scroll sideways on one line after
 * the label. On a tablet they wrap so every chip stays in sight, and in a narrow column (the
 * landscape history's side column) the label goes above them so the chips get the width.
 */
function SubjectChips({ exam, counts, subject, onPick }: { exam: Exam; counts: Map<string, number>; subject: string | null; onPick: (s: string) => void }) {
  const theme = useTheme();
  const { tablet, touch } = useWindowLayout();
  const { size } = useContentSize();
  const subjects = SUBJECTS_BY_EXAM[exam].filter((s) => counts.has(s));
  if (!subjects.length) return null;
  const stacked = tablet && size === 'compact';
  const chips = subjects.map((s) => (
    <Chip key={s} label={`${s} (${counts.get(s)})`} selected={subject === s} color={subjectColor(theme, s)} onPress={() => onPick(s)} />
  ));
  const label = (
    <AppText variant="label" color="textMuted">
      {exam}
    </AppText>
  );
  if (stacked) {
    return (
      <View style={{ gap: theme.spacing.xs }}>
        {label}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{chips}</View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
      <View style={{ width: CHIP_ROW_LABEL, minHeight: touch, justifyContent: 'center' }}>{label}</View>
      {tablet ? (
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: theme.spacing.sm }}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

function HistoryPanel() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const { subject, topicId, setSubject } = useHistoryFilter();
  const facets = useFacets();
  const list = useQuestionList({ subject, topicId });

  // Stagger the weeks only when it replaces a skeleton or the filter changed, never on a revisit.
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

  // The history's number: how many she saved (in this filter) and how her last answers went.
  const summary =
    list.isSuccess && total ? (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: theme.spacing.sm }}>
          <AppText variant="stat">{total}</AppText>
          <AppText variant="label" color="textMuted">
            {filtered ? 'soru bu filtrede' : 'soru kaydettin'}
          </AppText>
        </View>
        <ResultMeter correct={tally.correct} wrong={tally.wrong} blank={tally.blank} />
      </Card>
    ) : null;

  const results = (
    <>
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

      {byWeek(items).map((section, i) => (
        <Stagger key={section.title} animate={stagger} index={i}>
          <Section title={section.title} count={section.items.length}>
            <Card divided>
              {section.items.map((q) => (
                <ListRow key={q.id} {...questionRowProps(theme, q, { context: 'history', subjectDot: true, compact: !tablet })} />
              ))}
            </Card>
          </Section>
        </Stagger>
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

  // Landscape: the number and the filters share a band on top and the weeks run the full width
  // under it (a side column would scroll away and leave a blank third beside the list).
  // Portrait and phone stack them. While the first page loads, a bone holds the number's place.
  const head =
    summary ??
    (list.isPending ? (
      <Skeleton>
        <SkeletonCard lines={1} />
      </Skeleton>
    ) : null);
  return (
    <>
      {head ? (
        <Row gap={theme.spacing.xl}>
          <Col span={{ compact: 4, regular: 8, wide: 4 }}>{head}</Col>
          <Col span={{ compact: 4, regular: 8, wide: 8 }}>{filters}</Col>
        </Row>
      ) : (
        filters
      )}
      {results}
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
    <Screen title="Tekrar" subtitle="Yanlışların doğru zamanda geri gelir.">
      <SegmentedControl
        options={[
          { value: 'today', label: 'Bugün' },
          { value: 'history', label: 'Geçmiş' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'today' ? <TodayPanel /> : <HistoryPanel />}
    </Screen>
  );
}
