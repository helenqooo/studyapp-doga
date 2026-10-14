import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useReviewResult, useReviewsToday } from '../api/hooks';
import { demoQuestionImage } from '../api/demo/demoApi';
import type { ChoiceLabel, Question, ReviewResultInput, ReviewState } from '../api/types';
import { AnswerDock, DockLetters, DockStatus, DockSubmit } from '../components/AnswerDock';
import { AppText } from '../components/AppText';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useCompanionYield } from '../components/companion/Perch';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/mascot/Mascot';
import { MathView } from '../components/math/MathView';
import { Appear } from '../components/motion/Appear';
import { FocusPull } from '../components/motion/FocusPull';
import { Odometer } from '../components/motion/Odometer';
import { QuestionImage } from '../components/QuestionImage';
import { Merdiven, rungIndex } from '../components/review/Merdiven';
import { SessionPips, type PipResult } from '../components/review/SessionPips';
import { RevealOnMount, Screen, SplitScreen } from '../components/Screen';
import { TextToggle } from '../components/TextToggle';
import { ErrorState } from '../components/states/ErrorState';
import { Skeleton, SkeletonQuestion } from '../components/states/Skeleton';
import { DEMO_MODE, LOW_CONFIDENCE_THRESHOLD } from '../config';
import { getTopic, topicLabel } from '../data/topics';
import { useVerdict } from '../lib/celebrate';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { answerMarkdown, gradingKey, isGradedChoice, solutionMarkdown } from '../lib/question';
import { useCompanionStore } from '../store/companionStore';
import { subjectColor, useTheme } from '../theme';

// TOKEN-PENDING: layout.cta.minWidth = 240 (an auto-width lg primary never gets narrower)
const CTA_MIN_WIDTH = 240;
/** From this many right answers in a row the streak counter gets its flame. */
const STREAK_FLAME_AT = 3;

interface Outcome {
  correct: boolean;
  review: ReviewState;
  xpGained: number;
  /** The picked choice, if any. */
  pick: ChoiceLabel | null;
}

/** Whether the question has a photo to solve from (demo questions may come without one). */
function hasQuestionImage(id: string): boolean {
  return DEMO_MODE ? !!demoQuestionImage(id) : true;
}

/** "yarın" or "7 gün sonra". */
function inDays(days: number): string {
  return days <= 1 ? 'yarın' : `${days} gün sonra`;
}

/** This question's ladder line: where a right and a wrong answer would send it. */
function ladderLine(rung: number, rungs: readonly number[]): string {
  const up = rungs[rung + 1];
  return `Doğru: ${up ? inDays(up) : 'listeden çıkar'}. Yanlış: ${inDays(rungs[0]!)}.`;
}

/** The rung a review state sits on (a learned question stays on the top rung). */
function rungOf(review: ReviewState | null, rungs: readonly number[]): number {
  if (!review) return 0;
  if (review.status === 'graduated') return rungs.length - 1;
  return rungIndex(review.intervalDays, rungs);
}

/** "Üst üste 2 doğru", with a flame from three on. */
function StreakCounter({ streak }: { streak: number }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Üst üste ${streak} doğru`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
    >
      {streak >= STREAK_FLAME_AT ? <Icon name="flame" size={theme.layout.iconSize.sm} color={theme.colors.streak} filled /> : null}
      <AppText variant="label" color="textMuted" accessible={false}>
        Üst üste
      </AppText>
      <Odometer value={streak} variant="numeric" accessible={false} />
      <AppText variant="label" color="textMuted" accessible={false}>
        doğru
      </AppText>
    </View>
  );
}

function Feedback({ outcome, fromRung }: { outcome: Outcome; fromRung: number }) {
  const theme = useTheme();
  const rungs = theme.layout.ladder.rungs;
  const graduated = outcome.review.status === 'graduated';
  const title = !outcome.correct ? 'Sorun değil, yarın tekrar dene.' : graduated ? 'Bu soruyu öğrendin!' : 'Bir basamak yukarı.';
  const detail = !outcome.correct
    ? 'Soru ilk basamağa döndü, yarın yine karşına çıkacak.'
    : graduated
      ? 'Tekrar listesinden çıktı.'
      : `Sonraki tekrar ${inDays(outcome.review.intervalDays)}.`;
  return (
    <Card background={outcome.correct ? theme.colors.successSoft : theme.colors.dangerSoft}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon
          name={outcome.correct ? (graduated ? 'badge-check' : 'chevrons-up') : 'rotate-ccw'}
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
      {/* The ladder: the marker slides to the question's new rung. */}
      <Merdiven markerFrom={fromRung} marker={rungOf(outcome.review, rungs)} />
    </Card>
  );
}

function DoneScreen({ results, xp, remaining }: { results: PipResult[]; xp: number; remaining: number | null }) {
  const theme = useTheme();
  useCompanionYield();
  const total = results.length;
  const correct = results.filter((r) => r === 'correct').length;
  const wrong = total - correct;

  // Tell the companion once the queue's new size is known.
  const emitted = useRef(false);
  useEffect(() => {
    if (emitted.current || !total || remaining === null) return;
    emitted.current = true;
    useCompanionStore.getState().emit({ type: 'review.sessionDone', correct, wrong, remaining });
  }, [total, remaining, correct, wrong]);

  return (
    <Screen safeTop={false} width="readable">
      <Card variant="hero">
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}>
          <Mascot size={theme.layout.mascot.hero} mood={!total ? 'wink' : wrong === 0 ? 'celebrate' : 'cheer'} />
          <AppText variant="title" align="center">
            {total ? 'Tekrar bitti!' : 'Bugün tekrar yok'}
          </AppText>
          {total ? (
            <>
              <SessionPips results={results} style={{ justifyContent: 'center' }} />
              <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${total} sorudan ${correct} doğru`}>
                <FocusPull text={`${correct}/${total}`} variant="hero" play />
                <AppText variant="label" color="textMuted">
                  doğru
                </AppText>
              </View>
              {xp > 0 ? (
                <View
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.highlight,
                  }}
                >
                  <AppText variant="numeric" tint={theme.colors.highlightInk}>
                    +{xp} XP
                  </AppText>
                </View>
              ) : null}
              <AppText color="textMuted" align="center">
                {wrong ? 'Yanlışlar ilk basamağa döndü; her tekrar biraz daha ışık.' : 'Hepsi bir basamak yukarı çıktı, harika.'}
              </AppText>
            </>
          ) : (
            <AppText color="textMuted" align="center">
              Yanlış ya da boş bıraktığın sorular ertesi gün burada olacak.
            </AppText>
          )}
        </View>
      </Card>
      <Button label="Tamam" size="lg" onPress={() => router.back()} style={{ alignSelf: 'center', minWidth: CTA_MIN_WIDTH }} />
    </Screen>
  );
}

export default function ReviewSessionScreen() {
  const theme = useTheme();
  const rungs = theme.layout.ladder.rungs;
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
  const [choicesOpen, setChoicesOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [picked, setPicked] = useState<ChoiceLabel | null>(null);
  // The answer is being graded: the pick "seals" for a beat before the verdict shows.
  const [sealing, setSealing] = useState(false);
  const [results, setResults] = useState<PipResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!queue && today.data && !today.isFetching) {
      setQueue(today.data.items);
      setResults(today.data.items.map(() => null));
    }
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

  if (index >= queue.length) {
    // What is still due today once the answers are in (wrong ones come back tomorrow).
    const remaining = today.isFetching || !today.data ? null : today.data.items.length;
    return <DoneScreen results={results} xp={xp} remaining={remaining} />;
  }

  const q = queue[index]!;
  const topic = getTopic(q.topicId);
  const graded = isGradedChoice(q);
  const key = gradingKey(q);
  const fromRung = rungOf(q.review, rungs);

  // The dock is the optik form; the typed choices stay folded unless the photo may not carry
  // them (no photo, or a low-confidence reading), she opens them, or the verdict is in.
  const forceChoices = q.confidence < LOW_CONFIDENCE_THRESHOLD || !hasQuestionImage(q.id);
  const choicesShown = graded && (forceChoices || choicesOpen || !!outcome);

  const busy = submit.isPending || sealing;
  const answer = (input: Pick<ReviewResultInput, 'choice' | 'result'>, local?: 'blank') => {
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
            // "Bilmiyorum" is stored as wrong, but it feels (and is told to Lumi) as a blank.
            correct ? 'correct' : (local ?? 'wrong'),
            res.rewards,
            () => {
              setSealing(false);
              setRevealed(true);
              // A miss opens the solution right away: that's what to read now.
              if (!correct && graded) setShowSolution(true);
              setOutcome({ correct, review: res.review, xpGained: res.xpGained, pick: input.choice ?? null });
              setResults((r) => r.map((x, i) => (i === index ? (correct ? 'correct' : (local ?? 'wrong')) : x)));
              setStreak((s) => (correct ? s + 1 : 0));
              setXp((v) => v + res.xpGained);
            },
            // The burst starts from the graded choice row when it is on screen, else the dock letter.
            { fromRow: graded && !!input.choice && choicesShown },
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
    setChoicesOpen(false);
    setOutcome(null);
    setPicked(null);
    submit.reset();
  };

  const pick = (label: ChoiceLabel) => {
    if (outcome || busy) return;
    setPicked((p) => (p === label ? null : label));
  };

  const questionPane = (
    <>
      <SessionPips results={results} current={index} />

      <Appear still>
        <Card accessibilityLabel="Soru kâğıdı">
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <Badge label={q.exam} color={theme.colors.exam[q.exam].fg} background={theme.colors.exam[q.exam].bg} />
              <Badge label={q.subject} dot={subjectColor(theme, q.subject)} />
            </View>
            {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
          </View>
          <QuestionImage questionId={q.id} size="large" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <TextToggle open={showText} onToggle={() => setShowText((v) => !v)} />
            {graded && !forceChoices && !outcome ? <TextToggle open={choicesOpen} onToggle={() => setChoicesOpen((v) => !v)} label="Şıkları yazıyla gör" openLabel="Şıkları gizle" icon="list-checks" /> : null}
          </View>
          {showText ? <MathView markdown={q.questionText} /> : null}
          {choicesShown ? (
            <Appear still>
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
            </Appear>
          ) : null}
        </Card>
      </Appear>
    </>
  );

  // Before answering: how to answer, the run of right answers and where this one sits on the ladder.
  const guidePane = (
    <Card variant="flat">
      <AppText>{graded ? 'Kâğıtta çöz, şıkkını aşağıdan kodla.' : 'Kâğıtta çöz, hazır olunca cevabı aç.'}</AppText>
      <StreakCounter streak={streak} />
      <View style={{ gap: theme.spacing.sm }}>
        <Merdiven marker={fromRung} />
        <AppText variant="caption" color="textMuted">
          {ladderLine(fromRung, rungs)}
        </AppText>
      </View>
    </Card>
  );

  // What the student reads after answering (or after opening the answer to self-mark).
  const answerPane =
    revealed || outcome ? (
      <>
        <RevealOnMount delay={outcome ? theme.motion.duration.celebrate / 2 : 0}>
          <Appear style={{ gap: theme.spacing.lg }}>
            {outcome ? <Feedback outcome={outcome} fromRung={fromRung} /> : null}
            <Card title={showSolution ? 'Çözüm' : 'Doğru cevap'}>
              <MathView markdown={showSolution ? solutionMarkdown(q) : answerMarkdown(q)} fontSize={theme.fontSize.lg} />
            </Card>
          </Appear>
        </RevealOnMount>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Button
            label={showSolution ? 'Sadece cevap' : 'Çözümü gör'}
            icon="book-open"
            variant="secondary"
            onPress={() => setShowSolution((v) => !v)}
            style={{ flexGrow: 1 }}
          />
          <Button
            label="Anlamadım"
            icon="message-circle-question-mark"
            variant="secondary"
            onPress={() => router.push(`/question/${q.id}/chat`)}
            style={{ flexGrow: 1 }}
          />
        </View>
      </>
    ) : (
      guidePane
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
          answer={graded ? { labels: q.choices?.map((c) => c.label) ?? [], picked: outcome.pick, correct: key } : null}
        />
        <Button label={last ? 'Bitir' : 'Sonraki'} icon={last ? 'flag' : 'arrow-right'} onPress={next} style={{ flex: 1 }} />
      </AnswerDock>
    );
  } else if (graded) {
    dock = (
      <AnswerDock note={errorNote}>
        <DockLetters labels={q.choices?.map((c) => c.label) ?? []} selected={picked} sealing={sealing} disabled={busy} onPick={pick} />
        <DockSubmit
          ready={!!picked}
          loading={busy}
          onSubmit={() => picked && answer({ choice: picked })}
          secondary={{ label: 'Bilmiyorum', onPress: () => answer({ result: 'wrong' }, 'blank') }}
        />
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
