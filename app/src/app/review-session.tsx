import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useReviewResult, useReviewsToday } from '../api/hooks';
import type { Question, ReviewState } from '../api/types';
import { AppText } from '../components/AppText';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { MathView } from '../components/math/MathView';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionImage } from '../components/QuestionImage';
import { Screen } from '../components/Screen';
import { getTopic, topicLabel } from '../data/topics';
import { reviewDueLabel } from '../lib/format';
import { haptics } from '../lib/haptics';
import { answerMarkdown, solutionMarkdown } from '../lib/question';
import { subjectColor, useTheme } from '../theme';

interface Outcome {
  correct: boolean;
  review: ReviewState;
  xpGained: number;
}

function Feedback({ outcome }: { outcome: Outcome }) {
  const theme = useTheme();
  const graduated = outcome.review.status === 'graduated';
  const title = !outcome.correct ? 'Sorun değil, yarın tekrar dene.' : graduated ? 'Bu soruyu öğrendin!' : 'Harika!';
  const detail = !outcome.correct
    ? 'Soru başa döndü, yarın yine karşına çıkacak.'
    : graduated
      ? 'Tekrar listesinden çıktı.'
      : `Sonraki tekrar ${reviewDueLabel(outcome.review.dueDate)} (${outcome.review.intervalDays} gün).`;
  return (
    <Card background={outcome.correct ? theme.colors.successSoft : theme.colors.dangerSoft}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon
          name={outcome.correct ? (graduated ? 'checkmark.seal.fill' : 'checkmark.circle.fill') : 'arrow.counterclockwise.circle.fill'}
          size={theme.layout.iconSize.lg}
          color={outcome.correct ? theme.colors.success : theme.colors.danger}
        />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="bold" color={outcome.correct ? 'success' : 'danger'}>
            {title}
          </AppText>
          <AppText variant="label" color="textMuted">
            {detail}
          </AppText>
        </View>
        {outcome.xpGained > 0 ? (
          <Badge label={`+${outcome.xpGained} XP`} icon="star.fill" color={theme.colors.xp} background={theme.colors.xpTrack} />
        ) : null}
      </View>
    </Card>
  );
}

export default function ReviewSessionScreen() {
  const theme = useTheme();
  const today = useReviewsToday();
  const submit = useReviewResult();

  // Freeze the queue when the session starts so answering doesn't reshuffle it.
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showText, setShowText] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [tally, setTally] = useState({ correct: 0, wrong: 0, xp: 0 });

  useEffect(() => {
    if (!queue && today.data && !today.isFetching) setQueue(today.data.items);
  }, [queue, today.data, today.isFetching]);

  if (!queue) {
    return (
      <Screen safeTop={false}>
        {today.isError ? (
          <Card background={theme.colors.dangerSoft}>
            <AppText color="danger">{today.error.message}</AppText>
          </Card>
        ) : (
          <ActivityIndicator color={theme.colors.primary} />
        )}
      </Screen>
    );
  }

  const done = index >= queue.length;

  if (done) {
    const total = tally.correct + tally.wrong;
    return (
      <Screen safeTop={false}>
        <Card>
          <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}>
            <Icon name={total ? 'flag.checkered' : 'checkmark.circle'} size={theme.layout.iconSize.xl} color={theme.colors.primary} />
            <AppText variant="title" align="center">
              {total ? 'Tekrar bitti!' : 'Bugün tekrar yok'}
            </AppText>
            {total ? (
              <AppText color="textMuted" align="center">
                {tally.correct} doğru · {tally.wrong} yanlış
              </AppText>
            ) : (
              <AppText color="textMuted" align="center">
                Yanlış ya da boş bıraktığın sorular ertesi gün burada olacak.
              </AppText>
            )}
            {tally.xp > 0 ? (
              <Badge label={`+${tally.xp} XP`} icon="star.fill" color={theme.colors.xp} background={theme.colors.xpTrack} />
            ) : null}
          </View>
        </Card>
        <Button label="Tamam" size="lg" onPress={() => router.back()} />
      </Screen>
    );
  }

  const q = queue[index]!;
  const topic = getTopic(q.topicId);

  const answer = (correct: boolean) => {
    submit.mutate(
      { questionId: q.id, result: correct ? 'correct' : 'wrong', viewedSolution: showSolution },
      {
        onSuccess: (res) => {
          if (correct) haptics.success();
          else haptics.warning();
          setOutcome({ correct, review: res.review, xpGained: res.xpGained });
          setTally((t) => ({
            correct: t.correct + (correct ? 1 : 0),
            wrong: t.wrong + (correct ? 0 : 1),
            xp: t.xp + res.xpGained,
          }));
        },
        onError: () => haptics.error(),
      },
    );
  };

  const next = () => {
    setIndex((i) => i + 1);
    setRevealed(false);
    setShowSolution(false);
    setShowText(false);
    setOutcome(null);
    submit.reset();
  };

  return (
    // Keyed by question so the scroll position starts at the top for each one.
    <Screen key={q.id} safeTop={false}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="label" color="textMuted">
            Soru {index + 1} / {queue.length}
          </AppText>
          <AppText variant="label" color="textMuted">
            {tally.correct} doğru · {tally.wrong} yanlış
          </AppText>
        </View>
        <ProgressBar progress={index / queue.length} color={theme.colors.primary} trackColor={theme.colors.primarySoft} />
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={theme.colors.primary} background={theme.colors.primarySoft} />
          <Badge label={q.subject} color={subjectColor(theme, q.subject)} />
        </View>
        {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
      </View>

      <Card>
        <QuestionImage questionId={q.id} size="large" />
        {showText ? <MathView markdown={q.questionText} /> : null}
        <Button
          label={showText ? 'Soru metnini gizle' : 'Soru metnini göster'}
          variant="ghost"
          onPress={() => setShowText((v) => !v)}
        />
      </Card>

      {!revealed ? (
        <>
          <AppText color="textMuted" align="center">
            Soruyu kağıtta çöz, hazır olunca cevabı aç.
          </AppText>
          <Button
            label="Cevabı göster"
            icon="eye.fill"
            size="lg"
            onPress={() => {
              haptics.press();
              setRevealed(true);
            }}
          />
        </>
      ) : (
        <>
          <Card title="Doğru cevap">
            <MathView markdown={showSolution ? solutionMarkdown(q) : answerMarkdown(q)} />
          </Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              label={showSolution ? 'Çözümü gizle' : 'Çözümü gör'}
              icon="text.book.closed.fill"
              variant="secondary"
              onPress={() => setShowSolution((v) => !v)}
              style={{ flex: 1 }}
            />
            <Button
              label="Anlamadım"
              icon="questionmark.bubble.fill"
              variant="secondary"
              onPress={() => router.push(`/question/${q.id}/chat`)}
              style={{ flex: 1 }}
            />
          </View>

          {outcome ? (
            <>
              <Feedback outcome={outcome} />
              <Button
                label={index + 1 < queue.length ? 'Sonraki soru' : 'Bitir'}
                icon={index + 1 < queue.length ? 'arrow.right' : 'flag.checkered'}
                size="lg"
                onPress={next}
              />
            </>
          ) : (
            <>
              {submit.isError ? <AppText color="danger">{submit.error.message}</AppText> : null}
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  label="Yanlış yaptım"
                  icon="xmark"
                  variant="danger"
                  disabled={submit.isPending}
                  onPress={() => answer(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Doğru yaptım"
                  icon="checkmark"
                  variant="success"
                  loading={submit.isPending}
                  onPress={() => answer(true)}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
