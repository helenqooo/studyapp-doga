import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useExams, useOverview } from '../../api/hooks';
import type { Overview } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NetTrendChart } from '../../components/charts/NetTrendChart';
import { TopicLossBars } from '../../components/charts/TopicLossBars';
import { Chip } from '../../components/Chip';
import { ExamCard, examTitle } from '../../components/ExamCard';
import { Columns, Grid } from '../../components/Grid';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SubjectTrendTile } from '../../components/SubjectTrendTile';
import { WeeklySummaryCard } from '../../components/WeeklySummaryCard';
import type { Exam } from '../../data/topics';
import { useTheme } from '../../theme';
import { Appear } from '../../components/motion/Appear';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { Skeleton, SkeletonCard, SkeletonRows } from '../../components/states/Skeleton';

type Tab = 'list' | 'analysis';

function ExamList() {
  const theme = useTheme();
  const exams = useExams();

  return (
    <>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button
          label="Karne fotoğrafı"
          icon="scan-text"
          onPress={() => router.push({ pathname: '/exam/new', params: { source: 'photo' } })}
          style={{ flex: 1 }}
        />
        <Button label="Elle gir" icon="square-pen" variant="secondary" onPress={() => router.push('/exam/new')} style={{ flex: 1 }} />
      </View>

      {exams.isPending ? (
        <Skeleton>
          <SkeletonRows count={3} />
        </Skeleton>
      ) : null}
      {exams.isError ? <ErrorState error={exams.error} onRetry={() => exams.refetch()} /> : null}
      {exams.isSuccess && exams.data.items.length === 0 ? (
        <EmptyState mood="reading" title="Henüz deneme yok.">
          İlk denemeni gir; netlerini, trendini ve en çok net kaybettiğin konuları burada birlikte izleriz.
        </EmptyState>
      ) : null}
      <Grid columns={{ compact: 1, regular: 2, wide: 3 }}>
        {exams.data?.items.map((e, i) => (
          <Appear key={e.id} index={i}>
            <ExamCard exam={e} />
          </Appear>
        ))}
      </Grid>
    </>
  );
}

function ExamTrends({ overview, exam }: { overview: Overview; exam: Exam }) {
  const data = overview.byExam[exam];
  // Branş (partial) exams would distort the total, so the total trend uses complete ones.
  const complete = data.trend.filter((t) => t.complete);

  if (!data.count) {
    return (
      <AppText color="textMuted" align="center">
        Henüz {exam} denemesi yok.
      </AppText>
    );
  }

  const tiles = data.subjects.map((s) => ({
    summary: s,
    nets: data.trend.flatMap((t) => (s.subject in t.sections ? [t.sections[s.subject]!] : [])),
  }));

  return (
    <>
      <Card title={`Toplam net (${exam})`}>
        {complete.length ? (
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

      <Grid columns={{ compact: 2, regular: 4 }}>
        {tiles.map((t) => (
          <SubjectTrendTile key={t.summary.subject} summary={t.summary} nets={t.nets} />
        ))}
      </Grid>
    </>
  );
}

function Analysis() {
  const theme = useTheme();
  const overview = useOverview();
  const { refetch } = overview;
  const [exam, setExam] = useState<Exam | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (overview.isPending) {
    return (
      <Skeleton>
        <SkeletonCard lines={2} block={theme.layout.chart.trendHeight} />
        <SkeletonCard lines={4} />
      </Skeleton>
    );
  }
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;

  const o = overview.data;
  // Default to whichever exam has more data.
  const selected: Exam = exam ?? (o.byExam.AYT.count > o.byExam.TYT.count ? 'AYT' : 'TYT');

  return (
    // Hold the previous render (dimmed) while refetching instead of flashing a spinner.
    <View style={{ gap: theme.spacing.lg, opacity: overview.isFetching ? 0.6 : 1 }}>
      <Columns
        left={
          <>
            <WeeklySummaryCard />
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
          </>
        }
        right={
          <>
            {/* The exam filter scopes only the charts below it. */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {(['TYT', 'AYT'] as const).map((e) => (
                <Chip key={e} label={`${e} (${o.byExam[e].count})`} selected={selected === e} onPress={() => setExam(e)} />
              ))}
            </View>
            <ExamTrends overview={o} exam={selected} />
          </>
        }
      />
    </View>
  );
}

export default function ExamsScreen() {
  const [tab, setTab] = useState<Tab>('list');
  return (
    <Screen title="Deneme">
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
