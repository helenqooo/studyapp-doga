import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useExams, useOverview } from '../../api/hooks';
import type { ExamResult, Overview } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NetTrendChart } from '../../components/charts/NetTrendChart';
import { TopicLossBars } from '../../components/charts/TopicLossBars';
import { ExamRows, examTitle, SubjectLegend } from '../../components/ExamCard';
import { ExamHero } from '../../components/exams/ExamSummary';
import { newestFirst } from '../../components/exams/examMath';
import { Col, Row } from '../../components/Grid';
import { ease } from '../../components/motion/presets';
import { HeaderAction, Screen, useCompactHeader } from '../../components/Screen';
import { Section } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { Skeleton, SkeletonCard, SkeletonRows } from '../../components/states/Skeleton';
import { SubjectTiles } from '../../components/SubjectTrendTile';
import { WeeklySummaryCard } from '../../components/WeeklySummaryCard';
import type { Exam } from '../../data/topics';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';


type Tab = 'list' | 'analysis';

const EXAMS: Exam[] = ['TYT', 'AYT'];

const openPhoto = () => router.push({ pathname: '/exam/new', params: { source: 'photo' } });
const openManual = () => router.push('/exam/new');

/** Karne fotoğrafı (primary) and Elle gir (secondary). `fill`: the primary takes the rest of the row. */
function AddActions({ size = 'md', fill = false }: { size?: 'sm' | 'md'; fill?: boolean }) {
  const theme = useTheme();
  const compact = useCompactHeader();
  // The compact header bar repeats them at icon size.
  if (compact) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <HeaderAction icon="scan-text" label="Karne fotoğrafı" onPress={openPhoto} />
        <HeaderAction icon="square-pen" label="Elle gir" onPress={openManual} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Button label="Karne fotoğrafı" icon="scan-text" size={size} onPress={openPhoto} style={fill ? { flexGrow: 1 } : undefined} />
      <Button label="Elle gir" icon="square-pen" variant="secondary" size={size} onPress={openManual} />
    </View>
  );
}

/** One exam type's exams: a section on the paper, a legend for the strips, then one sheet of rows. */
function ExamSection({ exam, items, all }: { exam: Exam; items: ExamResult[]; all: ExamResult[] }) {
  return (
    <Section title={`${exam} denemeleri`} count={items.length || undefined}>
      {items.length ? (
        <>
          <SubjectLegend exam={exam} />
          <ExamRows items={items} all={all} />
        </>
      ) : (
        <AppText color="textMuted">Henüz {exam} denemesi yok.</AppText>
      )}
    </Section>
  );
}

function ExamList() {
  const { tablet } = useWindowLayout();
  const exams = useExams();

  if (exams.isPending) {
    return (
      <Skeleton>
        <SkeletonRows count={3} />
      </Skeleton>
    );
  }
  if (exams.isError) return <ErrorState error={exams.error} onRetry={() => exams.refetch()} />;

  const all = newestFirst(exams.data.items);
  if (!all.length) {
    return (
      <>
        <EmptyState mood="reading" title="Henüz deneme yok.">
          İlk denemeni gir; netlerini, trendini ve en çok net kaybettiğin konuları burada birlikte izleriz.
        </EmptyState>
        {tablet ? null : <AddActions fill />}
      </>
    );
  }

  return (
    <>
      {/* The primary: the latest TYT and AYT nets with their trends, in one sheet. */}
      <ExamHero exams={EXAMS} items={all} />
      {/* On a phone the add actions sit under the summary; on iPad they are in the title row. */}
      {tablet ? null : <AddActions fill />}
      {/* The lists run full width, one under the other: TYT always outnumbers AYT, so side by
          side columns would end far apart; full width, each row reads on one line. */}
      {EXAMS.map((x) => (
        <ExamSection key={x} exam={x} items={all.filter((e) => e.exam === x)} all={all} />
      ))}
    </>
  );
}

/** The trend sheet: TYT/AYT segmented in its header, then the net trend of full exams. */
function TrendSheet({ overview, exam, onExam }: { overview: Overview; exam: Exam; onExam: (e: Exam) => void }) {
  const theme = useTheme();
  const wide = useWindowLayout().sizeClass === 'wide';
  const data = overview.byExam[exam];
  // Branş (partial) exams would distort the total, so the total trend uses complete ones.
  const complete = data.trend.filter((t) => t.complete);
  return (
    <Card style={{ flexGrow: 1 }}>
      {/* Top-aligned, so the title shares a line with the subjects sheet's title beside it. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'space-between' }}>
        <AppText variant="heading" accessibilityRole="header">
          Toplam net
        </AppText>
        <SegmentedControl
          options={EXAMS.map((x) => ({ value: x, label: `${x} (${overview.byExam[x].count})` }))}
          value={exam}
          onChange={onExam}
        />
      </View>
      {!data.count ? (
        <AppText color="textMuted">Henüz {exam} denemesi yok.</AppText>
      ) : complete.length ? (
        <>
          <NetTrendChart
            max={data.maxNet}
            height={wide ? theme.layout.chart.trendHeight.wide : undefined}
            data={complete.map((t) => ({ key: t.id, date: t.date, label: examTitle({ name: t.name, exam }), value: t.totalNet }))}
          />
          {complete.length === 1 ? (
            <AppText variant="caption" color="textMuted">
              Trend için en az iki tam deneme gerekiyor.
            </AppText>
          ) : null}
        </>
      ) : (
        <AppText color="textMuted">Toplam net için tüm bölümleri içeren bir deneme gir.</AppText>
      )}
    </Card>
  );
}

function Analysis() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const blockGap = tablet ? theme.layout.screen.gap.tablet : theme.layout.screen.gap.compact;
  const reduceMotion = useReducedMotion();
  const overview = useOverview();
  const { refetch } = overview;
  const [exam, setExam] = useState<Exam | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Hold the previous render (dimmed) while refetching; the dim cross-fades, never cuts.
  const dim = overview.isFetching && !overview.isPending ? theme.opacity.analysisRefetch : 1;
  const fade = { duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const dimStyle = useAnimatedStyle(() => ({ opacity: withTiming(dim, fade) }), [dim, reduceMotion]);

  if (overview.isPending) {
    return (
      <Skeleton>
        <SkeletonCard lines={2} block={theme.layout.chart.trendHeight.compact} />
        <SkeletonCard lines={4} />
      </Skeleton>
    );
  }
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;

  const o = overview.data;
  // Default to whichever exam has more data.
  const selected: Exam = exam ?? (o.byExam.AYT.count > o.byExam.TYT.count ? 'AYT' : 'TYT');
  const data = o.byExam[selected];
  const tiles = data.subjects.map((s) => ({
    summary: s,
    nets: data.trend.flatMap((t) => (s.subject in t.sections ? [t.sections[s.subject]!] : [])),
  }));

  return (
    <Animated.View style={[{ gap: blockGap }, dimStyle]}>
      {/* The primary: the total net's trend; this exam type's subjects beside it in landscape. */}
      <Row>
        <Col span={{ compact: 4, regular: 8, wide: 7 }}>
          <TrendSheet overview={o} exam={selected} onExam={setExam} />
        </Col>
        {tiles.length ? (
          <Col span={{ compact: 4, regular: 8, wide: 5 }}>
            <SubjectTiles title={`${selected} dersleri`} tiles={tiles} style={{ flexGrow: 1 }} />
          </Col>
        ) : null}
      </Row>

      {/* Full width everywhere: in landscape the bars run in two columns, so the list is half as tall. */}
      <Card title="Net kaybettiğin konular">
        {o.topicLosses.length ? (
          <>
            <AppText variant="caption" color="textMuted" style={{ marginTop: -theme.spacing.sm }}>
              Son {o.windowDays} gün. Bir konuya dokununca o konudaki soruların açılır.
            </AppText>
            <TopicLossBars items={o.topicLosses} />
            <AppText variant="caption" color="textMuted">
              Denemeler ve çözdüğün sorular birlikte sayılır. Her yanlış 1,25, her boş 1 net; çözdüğün sorulardaki hatalar yarım ağırlıkta.
            </AppText>
          </>
        ) : (
          <AppText color="textMuted">Konu analizi olan bir deneme girdiğinde ya da soru çözüp işaretlediğinde burada görünür.</AppText>
        )}
      </Card>
      <WeeklySummaryCard />
    </Animated.View>
  );
}

export default function ExamsScreen() {
  const [tab, setTab] = useState<Tab>('list');
  const { tablet } = useWindowLayout();
  return (
    <Screen title="Deneme" subtitle="Netlerini gir, gidişatını izle." headerRight={tablet ? <AddActions size="sm" /> : undefined}>
      <SegmentedControl
        options={[
          { value: 'list', label: 'Denemeler' },
          { value: 'analysis', label: 'Analiz' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'list' ? <ExamList /> : <Analysis />}
    </Screen>
  );
}
