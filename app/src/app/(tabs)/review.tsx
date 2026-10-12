import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFacets, useQuestionList, useReviewsToday } from '../../api/hooks';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Grid } from '../../components/Grid';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { QuestionRow } from '../../components/QuestionRow';
import { Screen } from '../../components/Screen';
import { SegmentedControl } from '../../components/SegmentedControl';
import { getTopic, SUBJECTS_BY_EXAM, topicLabel } from '../../data/topics';
import { useHistoryFilter } from '../../store/historyFilter';
import { subjectColor, useTheme } from '../../theme';

type Tab = 'today' | 'history';

function TodayPanel() {
  const theme = useTheme();
  const today = useReviewsToday();
  const { refetch } = today;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (today.isPending) return <ActivityIndicator color={theme.colors.primary} />;
  if (today.isError) {
    return (
      <Card background={theme.colors.dangerSoft}>
        <AppText color="danger">{today.error.message}</AppText>
      </Card>
    );
  }

  const { items, completedToday } = today.data;
  const count = items.length;

  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          <View
            style={{
              width: theme.layout.minTouch + theme.spacing.lg,
              height: theme.layout.minTouch + theme.spacing.lg,
              borderRadius: theme.radius.pill,
              backgroundColor: count ? theme.colors.primarySoft : theme.colors.successSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={count ? 'arrow.triangle.2.circlepath' : 'checkmark'}
              size={theme.layout.iconSize.lg}
              color={count ? theme.colors.primary : theme.colors.success}
            />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="title">{count ? `${count} soru` : 'Hepsi tamam'}</AppText>
            <AppText color="textMuted">
              {count
                ? 'bugün tekrar bekliyor'
                : completedToday
                  ? `Bugün ${completedToday} tekrar yaptın.`
                  : 'Bugün tekrar edilecek soru yok.'}
            </AppText>
          </View>
        </View>
        {count ? <Button label="Tekrara başla" icon="play.fill" size="lg" onPress={() => router.push('/review-session')} /> : null}
      </Card>

      {count ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label" color="textMuted">
            Sıradakiler
          </AppText>
          <Grid columns={{ compact: 1, regular: 2, wide: 3 }}>
            {items.map((q) => (
              <QuestionRow key={q.id} question={q} />
            ))}
          </Grid>
        </View>
      ) : (
        <AppText variant="label" color="textMuted" align="center">
          Yanlış ya da boş bıraktığın sorular 1, 3, 7, 14 ve 30 gün sonra tekrar karşına çıkar.
        </AppText>
      )}
    </>
  );
}

function HistoryPanel() {
  const theme = useTheme();
  const { subject, topicId, setSubject } = useHistoryFilter();
  const facets = useFacets();
  const list = useQuestionList({ subject, topicId });

  const subjectCounts = new Map((facets.data?.subjects ?? []).map((s) => [s.subject, s.count]));
  const subjects = [...SUBJECTS_BY_EXAM.TYT, ...SUBJECTS_BY_EXAM.AYT].filter((s) => subjectCounts.has(s));
  const topic = getTopic(topicId);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleed to the screen edges while keeping the first chip aligned with the content.
        style={{ marginHorizontal: -theme.layout.screenPadding }}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.layout.screenPadding }}
      >
        <Chip label={`Tümü${facets.data ? ` (${facets.data.total})` : ''}`} selected={!subject} onPress={() => setSubject(null)} />
        {subjects.map((s) => (
          <Chip
            key={s}
            label={`${s} (${subjectCounts.get(s)})`}
            selected={subject === s}
            color={subjectColor(theme, s)}
            onPress={() => setSubject(subject === s ? null : s)}
          />
        ))}
      </ScrollView>

      {subject ? (
        <Button
          label={topic ? `Konu: ${topicLabel(topic)}` : 'Konu: Tümü'}
          icon="line.3.horizontal.decrease.circle"
          variant="secondary"
          onPress={() => router.push('/topic-picker')}
        />
      ) : null}

      {list.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {list.isError ? (
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{list.error.message}</AppText>
        </Card>
      ) : null}

      {list.isSuccess && items.length === 0 ? (
        <AppText color="textMuted" align="center">
          {subject ? 'Bu filtrede soru yok.' : 'Henüz soru çözmedin. İlk soruyu Çöz sekmesinden çek!'}
        </AppText>
      ) : null}

      {total ? (
        <AppText variant="label" color="textMuted">
          {total} soru
        </AppText>
      ) : null}

      <Grid columns={{ compact: 1, regular: 2, wide: 3 }}>
        {items.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </Grid>

      {list.hasNextPage ? (
        <Button label="Daha fazla göster" variant="ghost" loading={list.isFetchingNextPage} onPress={() => list.fetchNextPage()} />
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
