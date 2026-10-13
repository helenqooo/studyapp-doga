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
import { ExamCard, examTitle } from '../../components/ExamCard';
import { ExamSummary } from '../../components/exams/ExamSummary';
import { newestFirst, previousOf } from '../../components/exams/examMath';
import { Col, Grid, Row } from '../../components/Grid';
import { ease } from '../../components/motion/presets';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { Skeleton, SkeletonCard, SkeletonRows } from '../../components/states/Skeleton';
import { SubjectTrendTile } from '../../components/SubjectTrendTile';
import { WeeklySummaryCard } from '../../components/WeeklySummaryCard';
import type { Exam } from '../../data/topics';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;

type Tab = 'list' | 'analysis';

const EXAMS: Exam[] = ['TYT', 'AYT'];

const openPhoto = () => router.push({ pathname: '/exam/new', params: { source: 'photo' } });
const openManual = () => router.push('/exam/new');

/** Karne fotoğrafı (primary) and Elle gir (secondary). `fill`: the primary takes the rest of the row. */
function AddActions({ size = 'md', fill = false }: { size?: 'sm' | 'md'; fill?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Button label="Karne fotoğrafı" icon="scan-text" size={size} onPress={openPhoto} style={fill ? { flexGrow: 1 } : undefined} />
      <Button label="Elle gir" icon="square-pen" variant="secondary" size={size} onPress={openManual} />
    </View>
  );
}

/** One exam type's karne cards: 3 across in landscape, 2 in portrait, 1 on a phone. */
function ExamSection({ exam, items, all }: { exam: Exam; items: ExamResult[]; all: ExamResult[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title={`${exam} denemeleri`} count={items.length || undefined} />
      {items.length ? (
        <Grid columns={{ compact: 1, regular: 2, wide: 3 }}>
          {items.map((e) => (
            <ExamCard key={e.id} exam={e} previous={previousOf(e, all)} />
          ))}
        </Grid>
      ) : (
        <AppText color="textMuted">Henüz {exam} denemesi yok.</AppText>
      )}
    </View>
  );
}

function ExamList() {
  const theme = useTheme();
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
      <Row>
        {EXAMS.map((x) => (
          <Col key={x} span={{ compact: 2, regular: 4, wide: 6 }}>
            <ExamSummary exam={x} items={all} />
          </Col>
        ))}
      </Row>
      {/* On a phone the add actions sit under the summary; on iPad they are in the title row. */}
      {tablet ? null : <AddActions fill />}
      {EXAMS.map((x) => (
        <ExamSection key={x} exam={x} items={all.filter((e) => e.exam === x)} all={all} />
      ))}
    </>
  );
}

/** The trend sheet: TYT/AYT segmented in its header, then the net trend of full exams. */
function TrendSheet({ overview, exam, onExam }: { overview: Overview; exam: Exam; onExam: (e: Exam) => void }) {
  const theme = useTheme();
  const data = overview.byExam[exam];
  // Branş (partial) exams would distort the total, so the total trend uses complete ones.
  const complete = data.trend.filter((t) => t.complete);
  return (
    <Card style={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'space-between' }}>
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
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
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
    <Animated.View style={[{ gap: theme.spacing.lg }, dimStyle]}>
      {/* Chart first: the trend, with the subject tiles beside it in landscape. */}
      <Row>
        <Col span={{ compact: 4, regular: 8, wide: 7 }}>
          <TrendSheet overview={o} exam={selected} onExam={setExam} />
        </Col>
        <Col span={{ compact: 4, regular: 8, wide: 5 }}>
          {tiles.length ? (
            <Grid columns={{ compact: 2, regular: 4 }}>
              {tiles.map((t) => (
                <SubjectTrendTile key={t.summary.subject} summary={t.summary} nets={t.nets} />
              ))}
            </Grid>
          ) : null}
        </Col>
      </Row>

      <Card title={`En çok net kaybettiğin konular (son ${o.windowDays} gün)`}>
        {o.topicLosses.length ? (
          <>
            <TopicLossBars items={o.topicLosses} />
            <AppText variant="caption" color="textMuted">
              Deneme konu analizleri ve çözdüğün soruların birleşimi. Her yanlış 1,25, her boş 1 net sayılır; çözdüğün sorulardaki hatalar yarım ağırlıkta. Dokununca o konudaki sorularını açar.
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
    <Screen title="Deneme" headerRight={tablet ? <AddActions size="sm" /> : undefined}>
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
