import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useQuestion, useRecordAttempt } from '../../../api/hooks';
import type { AttemptInput, AttemptResult, ChoiceLabel, Question } from '../../../api/types';
import { AnswerDock, DockLetters, DockStatus, Pips } from '../../../components/AnswerDock';
import { AnswerKeyEditor } from '../../../components/AnswerKeyEditor';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Difficulty } from '../../../components/Difficulty';
import { Icon } from '../../../components/Icon';
import { Mascot } from '../../../components/mascot/Mascot';
import { MathView } from '../../../components/math/MathView';
import { Appear } from '../../../components/motion/Appear';
import { Loader } from '../../../components/motion/Loader';
import { QuestionImage } from '../../../components/QuestionImage';
import { RevealOnMount, Screen, SplitScreen } from '../../../components/Screen';
import { TextToggle } from '../../../components/TextToggle';
import { LOW_CONFIDENCE_THRESHOLD } from '../../../config';
import { getTopic, topicLabel } from '../../../data/topics';
import { useVerdict } from '../../../lib/celebrate';
import { reviewDueLabel, shortDate } from '../../../lib/format';
import { haptics } from '../../../lib/haptics';
import { useWindowLayout } from '../../../lib/layout';
import { gradingKey, isGradedChoice, RESULT_LABELS, RESULT_SHORT, solutionMarkdown } from '../../../lib/question';
import { subjectColor, useTheme } from '../../../theme';

function ReviewStatus({ q }: { q: Question }) {
  const theme = useTheme();
  const review = q.review;
  if (!review) return null;
  const graduated = review.status === 'graduated';
  return (
    <Card background={graduated ? theme.colors.successSoft : theme.colors.primarySoft}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon
          name={graduated ? 'badge-check' : 'repeat'}
          color={graduated ? theme.colors.success : theme.colors.primaryText}
        />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" tint={graduated ? theme.colors.success : theme.colors.primaryText}>
            {graduated ? 'Öğrenildi' : `Tekrar: ${reviewDueLabel(review.dueDate)} (${shortDate(review.dueDate)})`}
          </AppText>
          <AppText variant="label" color="textMuted">
            {graduated
              ? `${review.correctCount} doğru tekrarla listeden çıktı.`
              : `${review.intervalDays} günlük aralıkta · ${review.correctCount} doğru tekrar`}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function AttemptHistory({ q }: { q: Question }) {
  const theme = useTheme();
  if (q.attempts.length < 2) return null;
  const color = { correct: theme.colors.success, wrong: theme.colors.danger, blank: theme.colors.neutral };
  return (
    <Card title="Geçmiş">
      {[...q.attempts].reverse().map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="label" color="textMuted">
            {shortDate(a.createdAt)} · {a.source === 'solve' ? 'İlk çözüm' : 'Tekrar'}
          </AppText>
          <AppText variant="label" tint={color[a.result]}>
            {RESULT_SHORT[a.result]}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

/** What was saved: graded choice ("B dedin, doğrusu C") or the self-reported result. */
function SavedResult({ q, result, pick }: { q: Question; result: AttemptResult; pick: ChoiceLabel | null }) {
  const theme = useTheme();
  const key = gradingKey(q);
  const tone = { correct: theme.colors.success, wrong: theme.colors.danger, blank: theme.colors.neutral }[result];
  const icon = ({ correct: 'circle-check', wrong: 'circle-x', blank: 'circle-minus' } as const)[result];
  let title: string;
  let detail: string | null = null;
  if (isGradedChoice(q)) {
    title = result === 'correct' ? `Doğru! Cevap ${key}.` : result === 'wrong' ? `${pick} dedin, doğrusu ${key}.` : `Boş bıraktın. Doğrusu ${key}.`;
    if (result === 'wrong') detail = 'Üzülme, birlikte toparlarız: bu soru tekrar listende, yarın yeniden deneyeceğiz.';
  } else {
    title = `Kaydedildi: ${RESULT_LABELS[result]}${pick ? ` (cevabın: ${pick})` : ''}`;
  }
  // Lumi cheers a right answer, is sad with you about a wrong one, ponders a blank.
  const mood = result === 'correct' ? 'celebrate' : result === 'wrong' ? 'sad' : 'thinking';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Mascot mood={mood} size={theme.layout.mascot.note} />
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name={icon} color={tone} />
          <AppText weight="semibold" tint={tone} style={{ flex: 1 }}>
            {title}
          </AppText>
        </View>
        {detail ? (
          <AppText variant="label" color="textMuted">
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useQuestion(id);
  const record = useRecordAttempt(id);
  const { split } = useWindowLayout();
  const verdict = useVerdict();

  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [showText, setShowText] = useState(false);
  const [picked, setPicked] = useState<ChoiceLabel | null>(null);
  // The answer is being graded: the pick "seals" for a beat before the verdict shows.
  const [sealing, setSealing] = useState(false);
  // XP from the answer saved on this visit (null when the question was answered before).
  const [savedXp, setSavedXp] = useState<number | null>(null);

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
        <Button label="Tekrar dene" onPress={() => query.refetch()} />
      </Screen>
    );
  }

  const q = query.data;
  const topic = getTopic(q.topicId);
  const color = subjectColor(theme, q.subject);
  const lowConfidence = q.confidence < LOW_CONFIDENCE_THRESHOLD;
  // While the beat plays, the cache already holds the answer; show it once the beat ends.
  const saved = sealing ? undefined : q.attempts.find((a) => a.source === 'solve');
  const askedCount = Math.floor(q.messageCount / 2);
  const busy = record.isPending || sealing;

  const showHint = () => {
    haptics.select();
    setHintsShown((n) => Math.min(q.hints.length, n + 1));
  };

  const showSolution = () => {
    haptics.press();
    setSolutionShown(true);
  };

  const graded = isGradedChoice(q);
  const key = gradingKey(q);
  const labels = q.choices?.map((c) => c.label) ?? [];

  const save = (input: Pick<AttemptInput, 'choice' | 'result'>) => {
    if (busy) return;
    setSealing(true);
    verdict.begin();
    record.mutate(
      { ...input, hintsUsed: hintsShown, viewedSolution: solutionShown },
      {
        // The server decides right or wrong for a picked choice; the row shows it.
        onSuccess: (res) =>
          verdict.finish(
            res.attempt.result,
            res.rewards,
            () => {
              setSealing(false);
              setSavedXp(res.xpGained);
            },
            { fromRow: graded && !!input.choice },
          ),
        onError: () => {
          verdict.cancel();
          setSealing(false);
          haptics.error();
        },
      },
    );
  };

  // Choices under the question: pick your answer; once saved, the right one turns green
  // and a wrong pick red.
  const savedPick = saved?.userAnswer && q.choices?.some((c) => c.label === saved.userAnswer) ? (saved.userAnswer as ChoiceLabel) : null;
  const choiceState = saved
    ? graded
      ? { correct: key, wrong: savedPick && savedPick !== key ? savedPick : null, disabled: true }
      : { selected: savedPick, disabled: true }
    : { selected: picked, disabled: busy, sealing };
  const pick = (label: ChoiceLabel) => {
    if (saved || busy) return;
    haptics.select();
    setPicked((p) => (p === label ? null : label));
  };

  const title = <Stack.Screen options={{ title: topic ? topic.topic : 'Çözüm' }} />;
  const questionPane = (
    <>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={theme.colors.exam[q.exam].fg} background={theme.colors.exam[q.exam].bg} />
          <Badge label={q.subject} dot={color} />
          <Difficulty value={q.difficulty} />
        </View>
        {topic ? <AppText variant="heading">{topicLabel(topic)}</AppText> : null}
      </View>

      {lowConfidence ? (
        <Card background={theme.colors.warningSoft}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            <Icon name="triangle-alert" color={theme.colors.warning} />
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <AppText weight="semibold" color="warning">
                Cevap anahtarıyla kontrol et
              </AppText>
              <AppText variant="label" color="warning">
                Bu çözümden tam emin değilim (güven: %{Math.round(q.confidence * 100)}).
              </AppText>
            </View>
          </View>
          <AnswerKeyEditor q={q} />
        </Card>
      ) : null}

      <Card title="Soru">
        <QuestionImage questionId={q.id} size={split ? 'large' : 'regular'} />
        {/* The photo is the question; its typed-out copy is one tap away. */}
        <TextToggle open={showText} onToggle={() => setShowText((v) => !v)} />
        {showText ? <MathView markdown={q.questionText} /> : null}
        {q.choices?.length ? (
          <MathView markdown="" choices={q.choices} choiceState={choiceState} onChoice={pick} onVerdict={(v) => verdict.onVerdict(v.rect)} />
        ) : null}
      </Card>
    </>
  );

  const hintsLeft = q.hints.length - hintsShown;
  const workPane = (
    <>
      <ReviewStatus q={q} />
      {!solutionShown ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            label={hintsLeft > 0 ? 'İpucu' : 'İpuçları bitti'}
            icon="lightbulb"
            variant="secondary"
            disabled={hintsLeft <= 0}
            onPress={showHint}
            trailing={q.hints.length ? <Pips count={q.hints.length} filled={hintsShown} color={hintsLeft > 0 ? theme.colors.primaryText : theme.colors.disabledFg} /> : null}
            style={{ flex: 1 }}
          />
          <Button label="Tam çözüm" icon="book-open" variant="secondary" onPress={showSolution} style={{ flex: 1 }} />
        </View>
      ) : null}

      {q.hints.slice(0, hintsShown).map((hint, i) => (
        <RevealOnMount key={i}>
          <Appear>
            <Card title={`İpucu ${i + 1}`} background={theme.colors.hintBackground}>
              <MathView markdown={hint} typing="type" />
            </Card>
          </Appear>
        </RevealOnMount>
      ))}

      {solutionShown ? (
        <RevealOnMount>
          <Appear>
            <Card title="Tam çözüm">
              <MathView markdown={solutionMarkdown(q)} typing="type" />
            </Card>
          </Appear>
        </RevealOnMount>
      ) : null}

      <Button
        label={askedCount > 0 ? `Sohbete devam et (${askedCount})` : 'Anlamadım'}
        icon="message-circle-question-mark"
        variant="ghost"
        onPress={() => router.push(`/question/${q.id}/chat`)}
      />

      {saved ? (
        // After the row shows the verdict, the page glides to Lumi's reaction.
        <RevealOnMount delay={savedXp !== null ? theme.motion.duration.celebrate / 2 : 0}>
          <Appear>
            <Card title="Senin cevabın">
              <SavedResult q={q} result={saved.result} pick={savedPick} />
              {saved.result !== 'correct' && savedXp !== null ? (
                <AppText variant="label" color="textMuted">
                  Bu soru tekrar listene eklendi. Yarın karşına çıkacak.
                </AppText>
              ) : null}
              {!lowConfidence ? <AnswerKeyEditor q={q} /> : null}
            </Card>
          </Appear>
        </RevealOnMount>
      ) : null}

      <AttemptHistory q={q} />

      {saved && savedXp !== null ? <Button label="Ana sayfaya dön" variant="ghost" onPress={() => router.dismissTo('/')} /> : null}
    </>
  );

  // The dock: answer from anywhere on the page; afterwards, the next step.
  const errorNote = record.isError ? (
    <AppText variant="label" color="danger">
      {record.error.message}
    </AppText>
  ) : null;
  let dock: ReactNode = null;
  if (!saved && graded) {
    dock = (
      <AnswerDock note={errorNote}>
        <DockLetters labels={labels} selected={picked} sealing={sealing} disabled={busy} onPick={pick} />
        {picked ? (
          <Button label="Cevapla" loading={busy} onPress={() => save({ choice: picked })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
        ) : (
          <Button label="Boş" variant="neutral" disabled={busy} onPress={() => save({ result: 'blank' })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
        )}
      </AnswerDock>
    );
  } else if (!saved) {
    const note =
      errorNote ??
      (labels.length ? (
        <AppText variant="label" color="textMuted">
          {picked ? `Cevabın ${picked}. Sonuç ne oldu?` : 'İstersen şıkkını seç, sonra sonucu işaretle.'}
        </AppText>
      ) : null);
    dock = (
      <AnswerDock note={note}>
        <Button label="Doğru" icon="check" variant="success" loading={busy} onPress={() => save({ choice: picked, result: 'correct' })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
        <Button label="Yanlış" icon="x" variant="danger" disabled={busy} onPress={() => save({ choice: picked, result: 'wrong' })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
        <Button label="Boş" icon="minus" variant="neutral" disabled={busy} onPress={() => save({ result: 'blank' })} style={{ flex: 1, paddingHorizontal: theme.spacing.sm }} />
      </AnswerDock>
    );
  } else if (savedXp !== null) {
    dock = (
      <AnswerDock>
        <DockStatus
          title={saved.result === 'correct' ? 'Doğru!' : 'Tekrara eklendi'}
          tone={saved.result === 'correct' ? theme.colors.success : theme.colors.text}
          xp={savedXp}
        />
        <Button label="Yeni soru" icon="camera" onPress={() => router.replace('/camera')} style={{ flex: 1 }} />
      </AnswerDock>
    );
  }

  // Large iPad windows: the question stays in view on the left while the solution scrolls.
  if (split) {
    return (
      <>
        {title}
        <SplitScreen left={questionPane} right={workPane} dock={dock} />
      </>
    );
  }

  return (
    <Screen safeTop={false} width="readable" dock={dock}>
      {title}
      {questionPane}
      {workPane}
    </Screen>
  );
}
