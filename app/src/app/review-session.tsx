import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useReviewResult, useReviewsToday } from '../api/hooks';
import type { Question, ReviewState } from '../api/types';
import { AppText } from '../components/AppText';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { MathView } from '../components/math/MathView';
import { Appear } from '../components/motion/Appear';
import { Loader } from '../components/motion/Loader';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionImage } from '../components/QuestionImage';
import { Screen, SplitScreen } from '../components/Screen';
import { getTopic, topicLabel } from '../data/topics';
import { useResultCelebration } from '../lib/celebrate';
import { reviewDueLabel } from '../lib/format';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
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
          name={outcome.correct ? (graduated ? 'badge-check' : 'circle-check') : 'rotate-ccw'}
          size={theme.layout.iconSize.lg}
          color={outcome.correct ? theme.colors.success : theme.colors.danger}
        />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" color={outcome.correct ? 'success' : 'danger'}>
            {title}
          </AppText>
          <AppText variant="label" color="textMuted">
            {detail}
          </AppText>
        </View>
        {outcome.xpGained > 0 ? (
          <Badge label={`+${outcome.xpGained} XP`} icon="star" color={theme.colors.xpText} background={theme.colors.xpTrack} />
        ) : null}
      </View>
    </Card>
  );
}

export default function ReviewSessionScreen() {
  const theme = useTheme();
  const today = useReviewsToday();
  const submit = useReviewResult();
  const { split } = useWindowLayout();
  const startCelebration = useResultCelebration();

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
      <Screen safeTop={false} width="readable">
        {today.isError ? (
          <Card background={theme.colors.dangerSoft}>
            <AppText color="danger">{today.error.message}</AppText>
          </Card>
        ) : (
          <Loader />
        )}
      </Screen>
    );
  }

  const done = index >= queue.length;

  if (done) {
    const total = tally.correct + tally.wrong;
    return (
      <Screen safeTop={false} width="readable">
        <Appear>
          <Card>
            <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}>
              <Icon name={total ? 'flag' : 'circle-check'} size={theme.layout.iconSize.xl} color={theme.colors.primaryText} />
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
                <Badge label={`+${tally.xp} XP`} icon="star" color={theme.colors.xpText} background={theme.colors.xpTrack} />
              ) : null}
            </View>
          </Card>
        </Appear>
        <Appear index={1}>
          <Button label="Tamam" size="lg" onPress={() => router.back()} />
        </Appear>
      </Screen>
    );
  }

  const q = queue[index]!;
  const topic = getTopic(q.topicId);

  const answer = (correct: boolean) => {
    const celebrate = startCelebration();
    submit.mutate(
      { questionId: q.id, result: correct ? 'correct' : 'wrong', viewedSolution: showSolution },
      {
        onSuccess: (res) => {
          celebrate(correct ? 'correct' : 'wrong', res);
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

  const questionPane = (
    <>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="label" color="textMuted">
            Soru {index + 1} / {queue.length}
          </AppText>
          <AppText variant="label" color="textMuted">
            {tally.correct} doğru · {tally.wrong} yanlış
          </AppText>
        </View>
        {/* The screen remounts per question, so continue from the previous step. */}
        <ProgressBar
          progress={index / queue.length}
          from={Math.max(0, index - 1) / queue.length}
          color={theme.colors.primary}
          trackColor={theme.colors.primarySoft}
        />
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={theme.colors.primaryText} background={theme.colors.primarySoft} />
          <Badge label={q.subject} dot={subjectColor(theme, q.subject)} />
        </View>
        {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
      </View>

      <Appear>
        <Card>
          <QuestionImage questionId={q.id} size="large" />
          {showText ? <MathView markdown={q.questionText} /> : null}
          <Button
            label={showText ? 'Soru metnini gizle' : 'Soru metnini göster'}
            variant="ghost"
            onPress={() => setShowText((v) => !v)}
          />
        </Card>
      </Appear>
    </>
  );
  const answerPane = (
    <>
      {!revealed ? (
        <>
          <AppText color="textMuted" align="center">
            Soruyu kağıtta çöz, hazır olunca cevabı aç.
          </AppText>
          <Button
            label="Cevabı göster"
            icon="eye"
            size="lg"
            onPress={() => {
              haptics.press();
              setRevealed(true);
            }}
          />
        </>
      ) : (
        <>
          <Appear>
            <Card title="Doğru cevap">
              <MathView markdown={showSolution ? solutionMarkdown(q) : answerMarkdown(q)} />
            </Card>
          </Appear>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              label={showSolution ? 'Çözümü gizle' : 'Çözümü gör'}
              icon="book-open"
              variant="secondary"
              onPress={() => setShowSolution((v) => !v)}
              style={{ flex: 1 }}
            />
            <Button
              label="Anlamadım"
              icon="message-circle-question-mark"
              variant="secondary"
              onPress={() => router.push(`/question/${q.id}/chat`)}
              style={{ flex: 1 }}
            />
          </View>

          {outcome ? (
            <>
              <Appear>
                <Feedback outcome={outcome} />
              </Appear>
              <Appear index={1}>
                <Button
                  label={index + 1 < queue.length ? 'Sonraki soru' : 'Bitir'}
                  icon={index + 1 < queue.length ? 'arrow-right' : 'flag'}
                  size="lg"
                  onPress={next}
                />
              </Appear>
            </>
          ) : (
            <>
              {submit.isError ? <AppText color="danger">{submit.error.message}</AppText> : null}
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Button
                  label="Yanlış yaptım"
                  icon="x"
                  variant="danger"
                  disabled={submit.isPending}
                  onPress={() => answer(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Doğru yaptım"
                  icon="check"
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
    </>
  );

  // Keyed by question so scroll positions start at the top for each one.
  if (split) return <SplitScreen key={q.id} left={questionPane} right={answerPane} />;

  return (
    <Screen key={q.id} safeTop={false} width="readable">
      {questionPane}
      {answerPane}
    </Screen>
  );
}
