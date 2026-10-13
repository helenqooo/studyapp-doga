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
import { Screen } from '../../../components/Screen';
import { ErrorState } from '../../../components/states/ErrorState';
import { Skeleton, SkeletonCard } from '../../../components/states/Skeleton';
import { getTopic, topicLabel } from '../../../data/topics';
import { formatNet, longDate } from '../../../lib/format';
import { haptics } from '../../../lib/haptics';
import { subjectColor, useTheme } from '../../../theme';

/** D / Y / B totals as numeric pairs. */
function Totals({ correct, wrong, blank }: { correct: number; wrong: number; blank: number }) {
  const theme = useTheme();
  const pairs: [string, number][] = [
    ['Doğru', correct],
    ['Yanlış', wrong],
    ['Boş', blank],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.lg, rowGap: theme.spacing.xs }}>
      {pairs.map(([label, n]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="caption" color="textMuted">
            {label}
          </AppText>
          <AppText variant="numeric">{n}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function ExamDetailScreen() {
  const { id, xp } = useLocalSearchParams<{ id: string; xp?: string }>();
  const theme = useTheme();
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
    <Screen safeTop={false} title={examTitle(e)} subtitle={longDate(e.date)}>
      <Row>
        <Col span={{ compact: 4, regular: 8, wide: 5 }}>
          <Card variant="hero">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={e.exam} color={theme.colors.exam[e.exam].fg} background={theme.colors.exam[e.exam].bg} />
              {!isComplete(e) ? <Badge label="Branş denemesi" /> : null}
              {xp ? <Badge label={`+${xp} XP`} icon="star" color={theme.colors.highlightInk} background={theme.colors.highlight} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              {/* Netleşme: the net comes into focus once, right after saving. */}
              <FocusPull text={formatNet(e.totalNet)} variant="hero" play={!!xp} accessibilityLabel={`${formatNet(e.totalNet)} net`} />
              <AppText variant="heading" color="textMuted">
                /{e.totalQuestions} net
              </AppText>
            </View>
            {previous ? (
              <DeltaChip delta={e.totalNet - previous.totalNet} caption={`önceki ${e.exam} denemene göre`} />
            ) : null}
            <NetStrip sections={e.sections} max={examMax(e.exam)} />
            <Totals correct={sum('correct')} wrong={sum('wrong')} blank={sum('blank')} />
          </Card>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Button
              label="Düzenle"
              icon="pencil"
              variant="secondary"
              size="sm"
              onPress={() => router.push({ pathname: '/exam/[id]/edit', params: { id: e.id } })}
            />
            <InlineConfirm
              label="Sil"
              question="Silinsin mi?"
              loading={remove.isPending}
              error={remove.error ? `Silinemedi: ${remove.error.message}` : null}
              onConfirm={confirmDelete}
              style={{ flexGrow: 1 }}
            />
          </View>
        </Col>

        <Col span={{ compact: 4, regular: 8, wide: 7 }}>
          <Card title="Ders netleri">
            <SubjectMeters sections={e.sections} previous={previous} />
          </Card>
        </Col>
      </Row>

      {topics.length ? (
        <Card title="Konu analizi">
          <Grid columns={{ compact: 1, wide: 2 }}>
            {topics.map((t) => {
              const topic = getTopic(t.topicId);
              return (
                <View
                  key={t.topicId}
                  accessible
                  accessibilityLabel={`${topic ? topicLabel(topic) : t.topicId}: ${t.correct} doğru, ${t.wrong} yanlış, ${t.blank} boş, ${formatNet(lostNet(t))} net kayıp`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.layout.system.minTouch }}
                >
                  <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, t.subject) }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={2}>
                      {topic ? topicLabel(topic) : t.topicId}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                      {t.correct} doğru, {t.wrong} yanlış, {t.blank} boş
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
                    <AppText variant="numeric" color="danger">
                      −{formatNet(lostNet(t))}
                    </AppText>
                    <AppText variant="caption" color="danger">
                      net
                    </AppText>
                  </View>
                </View>
              );
            })}
          </Grid>
          <AppText variant="caption" color="textMuted">
            Kayıp: her yanlış 1,25, her boş 1 net.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
