import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useReviewResult, useReviewsToday } from '../api/hooks';
import type { ChoiceLabel, Question, ReviewResultInput, ReviewState } from '../api/types';
import { AnswerDock, DockLetters, DockStatus } from '../components/AnswerDock';
import { AppText } from '../components/AppText';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mascot } from '../components/mascot/Mascot';
import { Icon } from '../components/Icon';
import { MathView } from '../components/math/MathView';
import { Appear } from '../components/motion/Appear';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionImage } from '../components/QuestionImage';
import { RevealOnMount, Screen, SplitScreen } from '../components/Screen';
import { TextToggle } from '../components/TextToggle';
import { ErrorState } from '../components/states/ErrorState';
import { Skeleton, SkeletonQuestion } from '../components/states/Skeleton';
import { getTopic, topicLabel } from '../data/topics';
import { useVerdict } from '../lib/celebrate';
import { reviewDueLabel } from '../lib/format';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { answerMarkdown, gradingKey, isGradedChoice, solutionMarkdown } from '../lib/question';
import { subjectColor, useTheme } from '../theme';

interface Outcome {
  correct: boolean;
  review: ReviewState;
  xpGained: number;
  /** The picked choice, if any. */
  pick: ChoiceLabel | null;
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
      </View>
    </Card>
  );
}

export default function ReviewSessionScreen() {
  const theme = useTheme();
  const today = useReviewsToday();
  const submit = useReviewResult();
  const { split } = useWindowLayout();
  const verdict = useVerdict();

  // Freeze the queue when the session starts so answering doesn't reshuffle it.
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showText, setShowText] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [picked, setPicked] = useState<ChoiceLabel | null>(null);
  // The answer is being graded: the pick "seals" for a beat before the verdict shows.
  const [sealing, setSealing] = useState(false);
  const [tally, setTally] = useState({ correct: 0, wrong: 0, xp: 0 });

  useEffect(() => {
    if (!queue && today.data && !today.isFetching) setQueue(today.data.items);
  }, [queue, today.data, today.isFetching]);

  if (!queue) {
    return (
      <Screen safeTop={false} width="readable">
        {today.isError ? (
          <ErrorState error={today.error} onRetry={() => today.refetch()} />
        ) : (
          <Skeleton>
            <SkeletonQuestion />
          </Skeleton>
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
              <Mascot size={theme.layout.mascot.hero} mood={!total ? 'wink' : tally.wrong === 0 ? 'celebrate' : 'cheer'} />
              <AppText variant="title" align="center">
                {total ? 'Tekrar bitti!' : 'Bugün tekrar yok'}
              </AppText>
              {total ? (
                <AppText color="textMuted" align="center">
                  {tally.correct} doğru · {tally.wrong} yanlış.{' '}
                  {tally.wrong ? 'Yanlışlar baştan sıraya girdi; her tekrar biraz daha ışık.' : 'Hepsi yerinde, harika.'}
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

  const graded = isGradedChoice(q);
  const key = gradingKey(q);

  const busy = submit.isPending || sealing;
  const answer = (input: Pick<ReviewResultInput, 'choice' | 'result'>) => {
    if (busy) return;
    setSealing(true);
    verdict.begin();
    submit.mutate(
      { questionId: q.id, ...input, viewedSolution: showSolution },
      {
        // A picked choice is graded by the server; the row shows it.
        onSuccess: (res) => {
          const correct = res.attempt.result === 'correct';
          verdict.finish(
            correct ? 'correct' : 'wrong',
            res.rewards,
            () => {
              setSealing(false);
              setRevealed(true);
              // A miss opens the solution right away: that's what to read now.
              if (!correct && graded) setShowSolution(true);
              setOutcome({ correct, review: res.review, xpGained: res.xpGained, pick: input.choice ?? null });
              setTally((t) => ({
                correct: t.correct + (correct ? 1 : 0),
                wrong: t.wrong + (correct ? 0 : 1),
                xp: t.xp + res.xpGained,
              }));
            },
            { fromRow: graded && !!input.choice },
          );
        },
        onError: () => {
          verdict.cancel();
          setSealing(false);
          haptics.error();
        },
      },
    );
  };

  const next = () => {
    setIndex((i) => i + 1);
    setRevealed(false);
    setShowSolution(false);
    setShowText(false);
    setOutcome(null);
    setPicked(null);
    submit.reset();
  };

  const pick = (label: ChoiceLabel) => {
    if (outcome || busy) return;
    haptics.select();
    setPicked((p) => (p === label ? null : label));
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
          <Badge label={q.exam} color={theme.colors.exam[q.exam].fg} background={theme.colors.exam[q.exam].bg} />
          <Badge label={q.subject} dot={subjectColor(theme, q.subject)} />
        </View>
        {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
      </View>

      <Appear>
        <Card>
          <QuestionImage questionId={q.id} size="large" />
          <TextToggle open={showText} onToggle={() => setShowText((v) => !v)} />
          {showText ? <MathView markdown={q.questionText} /> : null}
          {graded ? (
            <MathView
              markdown=""
              choices={q.choices}
              choiceState={
                outcome
                  ? { correct: key, wrong: outcome.pick && outcome.pick !== key ? outcome.pick : null, disabled: true }
                  : { selected: picked, disabled: busy, sealing }
              }
              onChoice={pick}
              onVerdict={(v) => verdict.onVerdict(v.rect)}
            />
          ) : null}
        </Card>
      </Appear>
    </>
  );

  // What the student reads after answering (or after opening the answer to self-mark).
  const answerPane =
    revealed || outcome ? (
      <>
        <RevealOnMount delay={outcome ? theme.motion.duration.celebrate / 2 : 0}>
          <Appear style={{ gap: theme.spacing.lg }}>
            {outcome ? <Feedback outcome={outcome} /> : null}
            <Card title={showSolution ? 'Çözüm' : 'Doğru cevap'}>
              <MathView markdown={showSolution ? solutionMarkdown(q) : answerMarkdown(q)} fontSize={theme.fontSize.lg} />
            </Card>
          </Appear>
        </RevealOnMount>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label={showSolution ? 'Sadece cevap' : 'Çözümü gör'}
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
      </>
    ) : (
      <AppText color="textMuted" align="center">
        {graded ? 'Soruyu kâğıtta çöz, bulduğun şıkkı aşağıdan seç.' : 'Soruyu kâğıtta çöz, hazır olunca cevabı aç.'}
      </AppText>
    );

  // The dock: answer without scrolling, then go on.
  const errorNote = submit.isError ? (
    <AppText variant="label" color="danger">
      {submit.error.message}
    </AppText>
  ) : null;
  const last = index + 1 >= queue.length;
  let dock: ReactNode;
  if (outcome) {
    dock = (
      <AnswerDock>
        <DockStatus
          title={outcome.correct ? (outcome.review.status === 'graduated' ? 'Öğrendin!' : 'Doğru') : 'Yarın yine sorarım'}
          tone={outcome.correct ? theme.colors.success : theme.colors.text}
          xp={outcome.xpGained}
        />
        <Button label={last ? 'Bitir' : 'Sonraki'} icon={last ? 'flag' : 'arrow-right'} onPress={next} style={{ flex: 1 }} />
      </AnswerDock>
    );
  } else if (graded) {
    dock = (
      <AnswerDock note={errorNote}>
        <DockLetters labels={q.choices?.map((c) => c.label) ?? []} selected={picked} sealing={sealing} disabled={busy} onPick={pick} />
        {picked ? (
          <Button label="Cevapla" loading={busy} onPress={() => answer({ choice: picked })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
        ) : (
          <Button
            label="Bilmiyorum"
            variant="neutral"
            disabled={busy}
            onPress={() => answer({ result: 'wrong' })}
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
          />
        )}
      </AnswerDock>
    );
  } else if (!revealed) {
    dock = (
      <AnswerDock>
        <Button
          label="Cevabı göster"
          icon="eye"
          onPress={() => {
            haptics.press();
            setRevealed(true);
          }}
          style={{ flex: 1 }}
        />
      </AnswerDock>
    );
  } else {
    dock = (
      <AnswerDock note={errorNote}>
        <Button label="Yanlış yaptım" icon="x" variant="danger" disabled={busy} onPress={() => answer({ result: 'wrong' })} style={{ flex: 1 }} />
        <Button label="Doğru yaptım" icon="check" variant="success" loading={busy} onPress={() => answer({ result: 'correct' })} style={{ flex: 1 }} />
      </AnswerDock>
    );
  }

  // Keyed by question so scroll positions start at the top for each one.
  if (split) return <SplitScreen key={q.id} left={questionPane} right={answerPane} dock={dock} />;

  return (
    <Screen key={q.id} safeTop={false} width="readable" dock={dock}>
      {questionPane}
      {answerPane}
    </Screen>
  );
}
