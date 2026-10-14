import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useDeleteExam, useExam, useExams } from '../../../api/hooks';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { examTitle } from '../../../components/ExamCard';
import { DeltaChip } from '../../../components/exams/DeltaChip';
import { examMax, isComplete, lostNet, previousOf } from '../../../components/exams/examMath';
import { InlineConfirm } from '../../../components/exams/InlineConfirm';
import { NetStrip } from '../../../components/exams/NetStrip';
import { SubjectMeters } from '../../../components/exams/SubjectMeters';
import { Col, Grid, Row } from '../../../components/Grid';
import { FocusPull } from '../../../components/motion/FocusPull';
import { HeaderAction, Screen, useCompactHeader } from '../../../components/Screen';
import { ErrorState } from '../../../components/states/ErrorState';
import { KarneRow } from '../../../components/StatTile';
import { Skeleton, SkeletonCard } from '../../../components/states/Skeleton';
import { getTopic, topicLabel } from '../../../data/topics';
import { formatNet, longDate } from '../../../lib/format';
import { haptics } from '../../../lib/haptics';
import { useWindowLayout } from '../../../lib/layout';
import { subjectColor, useTheme } from '../../../theme';

/** D / Y / B totals as label and numeric pairs that never break mid-pair. */
function Totals({ correct, wrong, blank }: { correct: number; wrong: number; blank: number }) {
  const theme = useTheme();
  const pairs: [string, number][] = [
    ['Doğru', correct],
    ['Yanlış', wrong],
    ['Boş', blank],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.xl, rowGap: theme.spacing.xs }}>
      {pairs.map(([label, n]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="label" color="textMuted">
            {label}
          </AppText>
          <AppText variant="numeric">{n}</AppText>
        </View>
      ))}
    </View>
  );
}

/** Düzenle beside the title (an icon on a phone, where the title needs the room); an icon in the native header after scroll. */
function EditAction({ id }: { id: string }) {
  const compact = useCompactHeader();
  const { tablet } = useWindowLayout();
  const open = () => router.push({ pathname: '/exam/[id]/edit', params: { id } });
  if (compact || !tablet) return <HeaderAction icon="pencil" label="Düzenle" onPress={open} />;
  return <Button label="Düzenle" icon="pencil" variant="secondary" size="sm" onPress={open} />;
}

export default function ExamDetailScreen() {
  const { id, xp } = useLocalSearchParams<{ id: string; xp?: string }>();
  const theme = useTheme();
  const { touch, tablet } = useWindowLayout();
  const query = useExam(id);
  const all = useExams();
  const remove = useDeleteExam();

  if (query.isPending) {
    return (
      <Screen safeTop={false}>
        <Skeleton>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
        </Skeleton>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const e = query.data;
  const previous = previousOf(e, all.data?.items ?? []);
  const sum = (k: 'correct' | 'wrong' | 'blank') => e.sections.reduce((n, s) => n + s[k], 0);
  const topics = e.sections
    .flatMap((s) => s.topics.map((t) => ({ ...t, subject: s.subject })))
    .filter((t) => t.wrong + t.blank > 0)
    .sort((a, b) => lostNet(b) - lostNet(a));

  const confirmDelete = () =>
    remove.mutate(e.id, {
      onSuccess: () => {
        haptics.success();
        router.back();
      },
      onError: () => haptics.error(),
    });

  return (
    <Screen safeTop={false} title={examTitle(e)} subtitle={longDate(e.date)} headerRight={<EditAction id={e.id} />}>
      {/* Landscape: the net (the primary) beside the subject nets; stacked otherwise. */}
      <Row>
        <Col span={{ compact: 4, regular: 8, wide: 5 }}>
          <Card variant="hero" style={{ flexGrow: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={e.exam} color={theme.colors.exam[e.exam].fg} background={theme.colors.exam[e.exam].bg} />
              {!isComplete(e) ? <Badge label="Branş denemesi" /> : null}
              {xp ? <Badge label={`+${xp} XP`} icon="star" color={theme.colors.highlightInk} background={theme.colors.highlight} /> : null}
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                {/* Netleşme: the net comes into focus once, right after saving. */}
                <FocusPull text={formatNet(e.totalNet)} variant="hero" play={!!xp} accessibilityLabel={`${formatNet(e.totalNet)} net`} />
                <AppText variant="heading" color="textMuted">
                  /{e.totalQuestions} net
                </AppText>
              </View>
              {previous ? <DeltaChip delta={e.totalNet - previous.totalNet} caption={`önceki ${e.exam} denemene göre`} /> : null}
            </View>
            <View style={{ gap: theme.spacing.md, marginTop: 'auto' }}>
              <NetStrip sections={e.sections} max={examMax(e.exam)} />
              {/* iPad: the karne's D / Y / B as a plain karne row; a phone keeps them inline (three cells would fold). */}
              {tablet ? (
                <KarneRow
                  variant="plain"
                  cells={[
                    { label: 'Doğru', value: sum('correct') },
                    { label: 'Yanlış', value: sum('wrong') },
                    { label: 'Boş', value: sum('blank') },
                  ]}
                />
              ) : (
                <Totals correct={sum('correct')} wrong={sum('wrong')} blank={sum('blank')} />
              )}
            </View>
          </Card>
        </Col>

        <Col span={{ compact: 4, regular: 8, wide: 7 }}>
          <Card title="Ders netleri" style={{ flexGrow: 1 }}>
            <SubjectMeters sections={e.sections} previous={previous} />
          </Card>
        </Col>
      </Row>

      {topics.length ? (
        <Card title="Konu analizi">
          <AppText variant="caption" color="textMuted" style={{ marginTop: -theme.spacing.sm }}>
            En çok net kaybettirenler önce. Her yanlış 1,25, her boş 1 net.
          </AppText>
          <Grid columns={{ compact: 1, regular: 2 }} columnGap={theme.spacing.xxl} gap={theme.spacing.xs}>
            {topics.map((t) => {
              const topic = getTopic(t.topicId);
              return (
                <View
                  key={t.topicId}
                  accessible
                  accessibilityLabel={`${topic ? topicLabel(topic) : t.topicId}: ${t.correct} doğru, ${t.wrong} yanlış, ${t.blank} boş, ${formatNet(lostNet(t))} net kayıp`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: touch + theme.spacing.md }}
                >
                  <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, t.subject) }} />
                  <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                    <AppText variant="label" numberOfLines={2}>
                      {topic ? topicLabel(topic) : t.topicId}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                      {t.correct} doğru, {t.wrong} yanlış, {t.blank} boş
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
                    <AppText variant="numeric">−{formatNet(lostNet(t))}</AppText>
                    <AppText variant="caption" color="textMuted">
                      net
                    </AppText>
                  </View>
                </View>
              );
            })}
          </Grid>
        </Card>
      ) : null}

      {/* The one destructive action, quiet at the end of the page; it asks in place. */}
      <InlineConfirm
        label="Denemeyi sil"
        question="Bu deneme silinsin mi?"
        confirmLabel="Sil"
        loading={remove.isPending}
        error={remove.error ? `Silinemedi: ${remove.error.message}` : null}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}
