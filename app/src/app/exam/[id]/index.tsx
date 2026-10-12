import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { useDeleteExam, useExam } from '../../../api/hooks';
import type { ExamSection } from '../../../api/types';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { examTitle } from '../../../components/ExamCard';
import { Columns } from '../../../components/Grid';
import { Screen } from '../../../components/Screen';
import { getTopic, topicLabel } from '../../../data/topics';
import { formatNet, longDate } from '../../../lib/format';
import { haptics } from '../../../lib/haptics';
import { subjectColor, useTheme } from '../../../theme';
import { Loader } from '../../../components/motion/Loader';

const lost = (t: { wrong: number; blank: number }) => t.wrong * 1.25 + t.blank;

/** Ders | D | Y | B | Net table: the readable twin of the charts. */
function SectionTable({ sections }: { sections: ExamSection[] }) {
  const theme = useTheme();
  const cell = { width: theme.layout.minTouch, textAlign: 'right' as const, fontVariant: ['tabular-nums' as const] };
  const netCell = { ...cell, width: theme.layout.minTouch + theme.spacing.lg };
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <AppText variant="caption" color="textMuted" style={{ flex: 1 }}>
          Ders
        </AppText>
        {['D', 'Y', 'B'].map((h) => (
          <AppText key={h} variant="caption" color="textMuted" style={cell}>
            {h}
          </AppText>
        ))}
        <AppText variant="caption" color="textMuted" style={netCell}>
          Net
        </AppText>
      </View>
      {sections.map((s) => (
        <View key={s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <View
              style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, s.subject) }}
            />
            <AppText variant="label" numberOfLines={2} style={{ flexShrink: 1 }}>
              {s.subject}
            </AppText>
          </View>
          <AppText variant="label" style={cell}>
            {s.correct}
          </AppText>
          <AppText variant="label" style={cell}>
            {s.wrong}
          </AppText>
          <AppText variant="label" style={cell}>
            {s.blank}
          </AppText>
          <AppText variant="label" weight="semibold" style={netCell}>
            {formatNet(s.net)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function ExamDetailScreen() {
  const { id, xp } = useLocalSearchParams<{ id: string; xp?: string }>();
  const theme = useTheme();
  const query = useExam(id);
  const remove = useDeleteExam();

  if (query.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Loader />
      </View>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false}>
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{query.error.message}</AppText>
        </Card>
      </Screen>
    );
  }

  const e = query.data;
  const topics = e.sections
    .flatMap((s) => s.topics)
    .filter((t) => t.wrong + t.blank > 0)
    .sort((a, b) => lost(b) - lost(a));

  const confirmDelete = () =>
    Alert.alert('Denemeyi sil', `${examTitle(e)} silinsin mi? Bu geri alınamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          remove.mutate(e.id, {
            onSuccess: () => {
              haptics.success();
              router.back();
            },
            onError: (err) => Alert.alert('Silinemedi', err.message),
          }),
      },
    ]);

  return (
    <Screen safeTop={false}>
      <Stack.Screen options={{ title: examTitle(e) }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Badge label={e.exam} color={theme.colors.primaryText} background={theme.colors.primarySoft} />
        <AppText color="textMuted">{longDate(e.date)}</AppText>
        {xp ? <Badge label={`+${xp} XP`} icon="star" color={theme.colors.xpText} background={theme.colors.xpTrack} /> : null}
      </View>

      <Columns
        ratio={1.1}
        left={
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
              <AppText variant="display">{formatNet(e.totalNet)}</AppText>
              <AppText color="textMuted">net / {e.totalQuestions}</AppText>
            </View>
            <SectionTable sections={e.sections} />
          </Card>
        }
        right={
          <>
            {topics.length ? (
              <Card title="Konu analizi (en çok kaybedilenler)">
                {topics.map((t) => {
                  const topic = getTopic(t.topicId);
                  return (
                    <View key={t.topicId} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <AppText variant="label" numberOfLines={2} style={{ flex: 1 }}>
                        {topic ? topicLabel(topic) : t.topicId}
                      </AppText>
                      <AppText variant="caption" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
                        {t.correct}D {t.wrong}Y {t.blank}B
                      </AppText>
                      <AppText variant="label" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                        −{formatNet(lost(t))}
                      </AppText>
                    </View>
                  );
                })}
                <AppText variant="caption" color="textMuted">
                  Kayıp: her yanlış 1,25, her boş 1 net.
                </AppText>
              </Card>
            ) : null}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="Düzenle"
                icon="pencil"
                variant="secondary"
                onPress={() => router.push({ pathname: '/exam/[id]/edit', params: { id: e.id } })}
                style={{ flex: 1 }}
              />
              <Button label="Sil" icon="trash" variant="danger" loading={remove.isPending} onPress={confirmDelete} style={{ flex: 1 }} />
            </View>
          </>
        }
      />
    </Screen>
  );
}
