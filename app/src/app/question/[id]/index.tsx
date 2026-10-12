import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuestion, useRecordAttempt } from '../../../api/hooks';
import type { AttemptInput, AttemptResult, ChoiceLabel, Question } from '../../../api/types';
import { AnswerKeyEditor } from '../../../components/AnswerKeyEditor';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Difficulty } from '../../../components/Difficulty';
import { Icon } from '../../../components/Icon';
import { MathView } from '../../../components/math/MathView';
import { Appear } from '../../../components/motion/Appear';
import { Loader } from '../../../components/motion/Loader';
import { QuestionImage } from '../../../components/QuestionImage';
import { Screen, SplitScreen } from '../../../components/Screen';
import { LOW_CONFIDENCE_THRESHOLD } from '../../../config';
import { getTopic, topicLabel } from '../../../data/topics';
import { useResultCelebration } from '../../../lib/celebrate';
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
    if (result === 'wrong') detail = 'Yanlışlar tekrar listende; birkaç gün sonra yeniden deneyeceğiz.';
  } else {
    title = `Kaydedildi: ${RESULT_LABELS[result]}${pick ? ` (cevabın: ${pick})` : ''}`;
  }
  return (
    <View style={{ gap: theme.spacing.xxs }}>
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
  );
}

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useQuestion(id);
  const record = useRecordAttempt(id);
  const { split } = useWindowLayout();
  const celebrate = useResultCelebration();

  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [picked, setPicked] = useState<ChoiceLabel | null>(null);
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
  const saved = q.attempts.find((a) => a.source === 'solve');
  const askedCount = Math.floor(q.messageCount / 2);

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

  const save = (input: Pick<AttemptInput, 'choice' | 'result'>) => {
    record.mutate(
      { ...input, hintsUsed: hintsShown, viewedSolution: solutionShown },
      {
        onSuccess: (res) => {
          // The server decides right or wrong for a picked choice.
          celebrate(res.attempt.result, res.rewards);
          setSavedXp(res.xpGained);
        },
        onError: () => haptics.error(),
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
    : { selected: picked, disabled: record.isPending };
  const pick = (label: ChoiceLabel) => {
    if (saved || record.isPending) return;
    haptics.select();
    setPicked((p) => (p === label ? null : label));
  };

  const title = <Stack.Screen options={{ title: topic ? topic.topic : 'Çözüm' }} />;
  const questionPane = (
    <>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={theme.colors.primaryText} background={theme.colors.primarySoft} />
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
        <MathView markdown={q.questionText} choices={q.choices} choiceState={choiceState} onChoice={pick} />
      </Card>
    </>
  );
  const workPane = (
    <>
      <ReviewStatus q={q} />
      {q.hints.slice(0, hintsShown).map((hint, i) => (
        <Appear key={i}>
          <Card title={`İpucu ${i + 1}`} background={theme.colors.hintBackground}>
            <MathView markdown={hint} />
          </Card>
        </Appear>
      ))}

      {solutionShown ? (
        <Appear>
          <Card title="Tam çözüm">
            <MathView markdown={solutionMarkdown(q)} />
          </Card>
        </Appear>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        {!solutionShown ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              label={hintsShown < q.hints.length ? `İpucu (${hintsShown + 1}/${q.hints.length})` : 'İpuçları bitti'}
              icon="lightbulb"
              variant="secondary"
              disabled={hintsShown >= q.hints.length}
              onPress={showHint}
              style={{ flex: 1 }}
            />
            <Button label="Tam çözüm" icon="book-open" onPress={showSolution} style={{ flex: 1 }} />
          </View>
        ) : null}
        <Button
          label={askedCount > 0 ? `Sohbete devam et (${askedCount})` : 'Anlamadım'}
          icon="message-circle-question-mark"
          variant="ghost"
          onPress={() => router.push(`/question/${q.id}/chat`)}
        />
      </View>

      <Card title="Senin cevabın">
        {saved ? (
          <Appear style={{ gap: theme.spacing.sm }}>
            <SavedResult q={q} result={saved.result} pick={savedPick} />
            {savedXp ? (
              <Badge label={`+${savedXp} XP`} icon="star" color={theme.colors.xpText} background={theme.colors.xpTrack} />
            ) : null}
            {saved.result !== 'correct' && savedXp ? (
              <AppText variant="label" color="textMuted">
                Bu soru tekrar listene eklendi. Yarın karşına çıkacak.
              </AppText>
            ) : null}
            {!lowConfidence ? <AnswerKeyEditor q={q} /> : null}
          </Appear>
        ) : graded ? (
          <>
            <AppText color="textMuted">
              {picked ? `${picked} şıkkını seçtin. Emin misin?` : 'Kâğıtta bulduğun şıkkı yukarıdan seç.'}
            </AppText>
            {record.isError ? <AppText color="danger">{record.error.message}</AppText> : null}
            <Button
              label={picked ? `Cevabım ${picked}` : 'Önce bir şık seç'}
              icon="check"
              disabled={!picked || record.isPending}
              loading={record.isPending && !!picked}
              onPress={() => picked && save({ choice: picked })}
            />
            <Button label={RESULT_LABELS.blank} icon="minus" variant="neutral" disabled={record.isPending} onPress={() => save({ result: 'blank' })} />
          </>
        ) : (
          <>
            {q.choices?.length ? (
              <AppText variant="label" color="textMuted">
                {picked ? `Cevabın: ${picked}. Doğru mu yaptın?` : 'İstersen cevabını yukarıdan seç, sonra sonucu işaretle.'}
              </AppText>
            ) : null}
            {record.isError ? <AppText color="danger">{record.error.message}</AppText> : null}
            <Button label={RESULT_LABELS.correct} icon="check" variant="success" loading={record.isPending} onPress={() => save({ choice: picked, result: 'correct' })} />
            <Button label={RESULT_LABELS.wrong} icon="x" variant="danger" disabled={record.isPending} onPress={() => save({ choice: picked, result: 'wrong' })} />
            <Button label={RESULT_LABELS.blank} icon="minus" variant="neutral" disabled={record.isPending} onPress={() => save({ result: 'blank' })} />
          </>
        )}
      </Card>

      <AttemptHistory q={q} />

      {saved && savedXp ? (
        <Appear index={2} style={{ gap: theme.spacing.sm }}>
          <Button label="Yeni soru çöz" icon="camera" size="lg" onPress={() => router.replace('/camera')} />
          <Button label="Ana sayfaya dön" variant="ghost" onPress={() => router.dismissTo('/')} />
        </Appear>
      ) : null}
    </>
  );

  // Large iPad windows: the question stays in view on the left while the solution scrolls.
  if (split) {
    return (
      <>
        {title}
        <SplitScreen left={questionPane} right={workPane} />
      </>
    );
  }

  return (
    <Screen safeTop={false} width="readable">
      {title}
      {questionPane}
      {workPane}
    </Screen>
  );
}
