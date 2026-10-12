import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { authHeaders, questionImageUrl } from '../../api/client';
import { useQuestion, useRecordAttempt } from '../../api/hooks';
import type { AttemptResult, Question } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { MathView } from '../../components/math/MathView';
import { Screen } from '../../components/Screen';
import { LOW_CONFIDENCE_THRESHOLD } from '../../config';
import { getTopic, topicLabel } from '../../data/topics';
import { haptics } from '../../lib/haptics';
import { useSolveStore } from '../../store/solveStore';
import { subjectColor, useTheme } from '../../theme';

const CHOICES = ['A', 'B', 'C', 'D', 'E'];

const RESULT_LABELS: Record<AttemptResult, string> = {
  correct: 'Doğru yaptım',
  wrong: 'Yanlış yaptım',
  blank: 'Boş bıraktım',
};

function solutionMarkdown(q: Question): string {
  const steps = q.solutionSteps.map((s, i) => `**${i + 1}.** ${s}`).join('\n\n');
  return `${steps}\n\n> **Cevap:** ${q.finalAnswer}`;
}

function QuestionImage({ id }: { id: string }) {
  const theme = useTheme();
  const local = useSolveStore((s) => s.localImages[id]);
  const [expanded, setExpanded] = useState(false);
  const source = local ? { uri: local.uri } : { uri: questionImageUrl(id), headers: authHeaders };
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={expanded ? 'Görseli küçült' : 'Görseli büyüt'}
      onPress={() => setExpanded((e) => !e)}
      style={{
        height: expanded ? theme.layout.minTouch * 11 : theme.layout.minTouch * 5,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Image source={source} resizeMode="contain" style={{ flex: 1 }} />
    </Pressable>
  );
}

function Difficulty({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name={n <= value ? 'star.fill' : 'star'}
          size={theme.fontSize.sm}
          color={n <= value ? theme.colors.xp : theme.colors.textMuted}
        />
      ))}
    </View>
  );
}

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useQuestion(id);
  const record = useRecordAttempt(id);

  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [savedXp, setSavedXp] = useState<number | null>(null);

  if (query.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false}>
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{query.error.message}</AppText>
        </Card>
        <Button label="Tekrar dene" onPress={() => query.refetch()} />
      </Screen>
    );
  }

  const q = query.data;
  const topic = getTopic(q.topicId);
  const color = subjectColor(theme, q.subject);
  const lowConfidence = q.confidence < LOW_CONFIDENCE_THRESHOLD;
  const saved = q.attempts.find((a) => a.source === 'solve');

  const showHint = () => {
    haptics.select();
    setHintsShown((n) => Math.min(q.hints.length, n + 1));
  };

  const showSolution = () => {
    haptics.press();
    setSolutionShown(true);
  };

  const save = (result: AttemptResult) => {
    record.mutate(
      { result, userAnswer, hintsUsed: hintsShown, viewedSolution: solutionShown },
      {
        onSuccess: (res) => {
          haptics.success();
          setSavedXp(res.xpGained);
        },
        onError: () => haptics.error(),
      },
    );
  };

  return (
    <Screen safeTop={false}>
      <Stack.Screen options={{ title: topic ? topic.topic : 'Çözüm' }} />

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={theme.colors.primary} background={theme.colors.primarySoft} />
          <Badge label={q.subject} color={color} />
          <Difficulty value={q.difficulty} />
        </View>
        {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
      </View>

      {lowConfidence ? (
        <Card background={theme.colors.warningSoft}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            <Icon name="exclamationmark.triangle.fill" color={theme.colors.warning} />
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <AppText weight="bold" color="warning">
                Cevap anahtarıyla kontrol et
              </AppText>
              <AppText variant="label" color="warning">
                Bu çözümden tam emin değilim (güven: %{Math.round(q.confidence * 100)}).
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <Card title="Soru">
        <QuestionImage id={q.id} />
        <MathView markdown={q.questionText} />
      </Card>

      {q.hints.slice(0, hintsShown).map((hint, i) => (
        <Card key={i} title={`İpucu ${i + 1}`} background={theme.colors.hintBackground}>
          <MathView markdown={hint} />
        </Card>
      ))}

      {solutionShown ? (
        <Card title="Tam çözüm">
          <MathView markdown={solutionMarkdown(q)} />
        </Card>
      ) : null}

      {!solutionShown ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label={hintsShown < q.hints.length ? `İpucu (${hintsShown + 1}/${q.hints.length})` : 'İpuçları bitti'}
            icon="lightbulb.fill"
            variant="secondary"
            disabled={hintsShown >= q.hints.length}
            onPress={showHint}
            style={{ flex: 1 }}
          />
          <Button label="Tam çözüm" icon="text.book.closed.fill" onPress={showSolution} style={{ flex: 1 }} />
        </View>
      ) : null}

      <Card title="Sen ne yaptın?">
        {saved ? (
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="checkmark.circle.fill" color={theme.colors.success} />
              <AppText weight="semibold" style={{ flex: 1 }}>
                Kaydedildi: {RESULT_LABELS[saved.result]}
                {saved.userAnswer ? ` (cevabın: ${saved.userAnswer})` : ''}
              </AppText>
            </View>
            {savedXp ? (
              <Badge label={`+${savedXp} XP`} icon="star.fill" color={theme.colors.xp} background={theme.colors.xpTrack} />
            ) : null}
            {saved.result !== 'correct' ? (
              <AppText variant="label" color="textMuted">
                Bu soru tekrar listene eklendi.
              </AppText>
            ) : null}
          </View>
        ) : (
          <>
            <AppText variant="label" color="textMuted">
              Cevabın (isteğe bağlı)
            </AppText>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {CHOICES.map((choice) => {
                const active = userAnswer === choice;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="button"
                    accessibilityLabel={`Cevabım ${choice}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptics.select();
                      setUserAnswer(active ? null : choice);
                    }}
                    style={{
                      flex: 1,
                      height: theme.layout.minTouch,
                      borderRadius: theme.radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                    }}
                  >
                    <AppText weight="bold" tint={active ? theme.colors.textOnAccent : theme.colors.text}>
                      {choice}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {record.isError ? <AppText color="danger">{record.error.message}</AppText> : null}

            <Button label={RESULT_LABELS.correct} icon="checkmark" variant="success" loading={record.isPending} onPress={() => save('correct')} />
            <Button label={RESULT_LABELS.wrong} icon="xmark" variant="danger" disabled={record.isPending} onPress={() => save('wrong')} />
            <Button label={RESULT_LABELS.blank} icon="minus" variant="neutral" disabled={record.isPending} onPress={() => save('blank')} />
          </>
        )}
      </Card>

      {saved ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Yeni soru çöz" icon="camera.fill" size="lg" onPress={() => router.replace('/camera')} />
          <Button label="Ana sayfaya dön" variant="ghost" onPress={() => router.dismissTo('/')} />
        </View>
      ) : null}
    </Screen>
  );
}
