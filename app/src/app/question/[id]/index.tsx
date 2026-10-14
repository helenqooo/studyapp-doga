import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useQuestion, useRecordAttempt } from '../../../api/hooks';
import type { AttemptInput, ChoiceLabel, Question } from '../../../api/types';
import { AnswerDock, DockLetters, DockStatus, DockSubmit } from '../../../components/AnswerDock';
import { AnswerKeyEditor } from '../../../components/AnswerKeyEditor';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card, ListRow } from '../../../components/Card';
import { Difficulty } from '../../../components/Difficulty';
import { Icon } from '../../../components/Icon';
import { MathView } from '../../../components/math/MathView';
import { Appear } from '../../../components/motion/Appear';
import { AnswerStrip } from '../../../components/question/AnswerStrip';
import { HintStack, SolutionSheet } from '../../../components/question/HintStack';
import { ResultTag } from '../../../components/question/ResultTag';
import { WorkDesk } from '../../../components/question/WorkDesk';
import { QuestionImage } from '../../../components/QuestionImage';
import { RevealOnMount, Screen, SplitScreen } from '../../../components/Screen';
import { SectionHeader } from '../../../components/SectionHeader';
import { ErrorState } from '../../../components/states/ErrorState';
import { Skeleton, SkeletonQuestion } from '../../../components/states/Skeleton';
import { TextToggle } from '../../../components/TextToggle';
import { LOW_CONFIDENCE_THRESHOLD } from '../../../config';
import { getTopic } from '../../../data/topics';
import { useVerdict } from '../../../lib/celebrate';
import { reviewDueLabel, shortDate } from '../../../lib/format';
import { haptics } from '../../../lib/haptics';
import { useWindowLayout } from '../../../lib/layout';
import { gradingKey, isGradedChoice, RESULT_SHORT, solutionMarkdown } from '../../../lib/question';
import { subjectColor, subjectSoftColor, useTheme } from '../../../theme';

// TOKEN-PENDING: question.historyFoldMin = 3 (this many reviews with one result fold into one Geçmiş row)
const HISTORY_FOLD_MIN = 3;

function ReviewStatus({ q }: { q: Question }) {
  const theme = useTheme();
  const review = q.review;
  if (!review) return null;
  const graduated = review.status === 'graduated';
  return (
    <Card background={graduated ? theme.colors.successSoft : theme.colors.primarySoft}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon name={graduated ? 'badge-check' : 'repeat'} color={graduated ? theme.colors.success : theme.colors.primaryText} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText weight="semibold" tint={graduated ? theme.colors.success : theme.colors.primaryText}>
            {graduated ? 'Öğrenildi' : `Tekrar: ${reviewDueLabel(review.dueDate)} (${shortDate(review.dueDate)})`}
          </AppText>
          <AppText variant="label" color="textMuted">
            {graduated
              ? `${review.correctCount} doğru tekrarla listeden çıktı.`
              : `${review.intervalDays} günlük aralıkta, ${review.correctCount} doğru tekrar`}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

/**
 * Geçmiş: when she answered and how it went, newest first. The date is the row's name; only
 * the first solve says what it was. Three or more reviews with one result fold into a
 * single row ("5 tekrar", "Hepsi doğru") above the first solve.
 */
function AttemptHistory({ q }: { q: Question }) {
  if (q.attempts.length < 2) return null;
  const newest = [...q.attempts].reverse();
  const reviews = newest.filter((a) => a.source !== 'solve');
  const first = newest.filter((a) => a.source === 'solve');
  const same = reviews.length >= HISTORY_FOLD_MIN && reviews.every((a) => a.result === reviews[0]!.result);
  const row = (a: Question['attempts'][number]) => {
    const detail = a.source === 'solve' ? 'İlk çözüm' : undefined;
    const date = shortDate(a.createdAt);
    return (
      <ListRow
        key={a.id}
        title={date}
        detail={detail}
        trailing={<ResultTag result={a.result} />}
        accessibilityLabel={`${date}, ${detail ? `${detail}, ` : ''}${RESULT_SHORT[a.result]}`}
      />
    );
  };
  if (!same) {
    return (
      <Card divided title="Geçmiş">
        {newest.map(row)}
      </Card>
    );
  }
  const result = reviews[0]!.result;
  const span = `${shortDate(reviews[reviews.length - 1]!.createdAt)} – ${shortDate(reviews[0]!.createdAt)}`;
  const all = `Hepsi ${RESULT_SHORT[result].toLocaleLowerCase('tr')}`;
  return (
    <Card divided title="Geçmiş">
      <ListRow title={`${reviews.length} tekrar`} detail={span} trailing={<ResultTag result={result} label={all} />} accessibilityLabel={`${reviews.length} tekrar, ${span}, ${all}`} />
      {first.map(row)}
    </Card>
  );
}

/**
 * The title block in the split layout, where Screen doesn't draw it: the topic in Lora and
 * its unit under it. Reports its height so the desk's first sheet starts level with the
 * question sheet.
 */
function PaneTitle({ title, subtitle, onHeight }: { title: string; subtitle?: string; onHeight: (h: number) => void }) {
  const theme = useTheme();
  const sl = theme.layout.screen;
  return (
    <View onLayout={(e) => onHeight(Math.round(e.nativeEvent.layout.height))} style={{ gap: sl.titleGap.tablet, marginBottom: sl.afterTitle.tablet }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
    </View>
  );
}

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useQuestion(id);
  const record = useRecordAttempt(id);
  const { split, tablet } = useWindowLayout();
  const verdict = useVerdict();

  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const [picked, setPicked] = useState<ChoiceLabel | null>(null);
  // The answer is being graded: the pick "seals" for a beat before the verdict shows.
  const [sealing, setSealing] = useState(false);
  // XP from the answer saved on this visit (null when the question was answered before).
  const [savedXp, setSavedXp] = useState<number | null>(null);
  // Split layout: the title block's height, so the desk's band matches it.
  const [titleHeight, setTitleHeight] = useState(0);

  if (query.isPending) {
    return (
      <Screen safeTop={false} width="readable">
        <Skeleton>
          <SkeletonQuestion />
        </Skeleton>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false} width="readable">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const q = query.data;
  const topic = getTopic(q.topicId);
  const lowConfidence = q.confidence < LOW_CONFIDENCE_THRESHOLD;
  // While the beat plays, the cache already holds the answer; show it once the beat ends.
  const saved = sealing ? undefined : q.attempts.find((a) => a.source === 'solve');
  const askedCount = Math.floor(q.messageCount / 2);
  const busy = record.isPending || sealing;
  const graded = isGradedChoice(q);
  const key = gradingKey(q);
  const labels = q.choices?.map((c) => c.label) ?? [];
  // The dock is the optik form: the typed choices stay behind a toggle unless the key is
  // doubtful, there is no photo to read them from, or the verdict is in (review-session rule).
  // In one column the verdict sheet's A–E strip already shows the marks, and opening the
  // choices above it would push the verdict down as it lands, so there they stay folded.
  const choicesCollapsed = graded && !lowConfidence && !imageMissing && !(saved && split);
  const choicesVisible = !!q.choices?.length && (!choicesCollapsed || showChoices);

  // Secondary and ghost actions carry no haptic (spec 5.5).
  const showHint = () => setHintsShown((n) => Math.min(q.hints.length, n + 1));
  const showSolution = () => setSolutionShown(true);

  const save = (input: Pick<AttemptInput, 'choice' | 'result'>) => {
    if (busy) return;
    setSealing(true);
    verdict.begin();
    // With the typed choices on screen the burst launches from the graded row; otherwise
    // from the coded letter in the dock.
    const fromRow = graded && !!input.choice && choicesVisible;
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
            // The companion hears how many hints she used (the "İpucuyla buldun" line).
            { fromRow, hintsUsed: hintsShown, source: 'solve' },
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
    setPicked((p) => (p === label ? null : label));
  };
  const pickFromRow = (label: ChoiceLabel) => {
    if (saved || busy) return;
    haptics.grain();
    pick(label);
  };

  const imageCap = split ? theme.layout.question.imageCap.split : tablet ? theme.layout.question.imageCap.tablet : theme.layout.question.imageCap.compact;
  const exam = theme.colors.exam[q.exam];

  // The topic is the large title, its unit the line under it (the sheet's badges carry the
  // exam and the subject). The native title fades in after scroll (Screen); in the split
  // the pane draws the title instead.
  const heading = topic ? (topic.subtopic ?? topic.topic) : q.subject;
  const subheading = topic?.subtopic ? topic.topic : undefined;
  // Only the split sets headerTitle: a `headerTitle` key here would override Screen's own.
  const title = <Stack.Screen options={split ? { title: q.subject, headerTitle: () => null } : { title: q.subject }} />;
  const sl = theme.layout.screen;

  // ---- Soru kâğıdı -----------------------------------------------------------------------
  const questionPane = (
    <>
      {split ? <PaneTitle title={heading} subtitle={subheading} onHeight={setTitleHeight} /> : null}
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

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
          <Badge label={q.exam} color={exam.fg} background={exam.bg} />
          <Badge label={q.subject} dot={subjectColor(theme, q.subject)} background={subjectSoftColor(theme, q.subject)} />
          <Difficulty value={q.difficulty} />
        </View>
        {/* The photo is the question; its typed-out copy is one tap away. Without a photo
            (it failed to load) the typed copy takes its place. */}
        {imageMissing ? null : (
          <>
            <QuestionImage questionId={q.id} cap={imageCap} pillPlacement="below" zoomable onError={() => setImageMissing(true)} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <TextToggle open={showText} onToggle={() => setShowText((v) => !v)} />
              {choicesCollapsed && q.choices?.length ? (
                <TextToggle
                  open={showChoices}
                  onToggle={() => setShowChoices((v) => !v)}
                  label="Şıkları yazıyla gör"
                  openLabel="Şıkları gizle"
                  icon="list-checks"
                />
              ) : null}
            </View>
          </>
        )}
        {showText || imageMissing ? <MathView markdown={q.questionText} /> : null}
        {choicesVisible ? (
          <MathView markdown="" choices={q.choices} choiceState={choiceState} onChoice={pickFromRow} onVerdict={(v) => verdict.onVerdict(v.rect)} />
        ) : null}
      </Card>
    </>
  );

  // ---- Çalışma masası --------------------------------------------------------------------
  const line = graded
    ? `Kâğıtta çöz, şıkkını aşağıdan kodla.${q.hints.length ? ' Takılırsan ipucu var.' : ''}`
    : `Kâğıtta çöz, sonucunu aşağıdan işaretle.${q.hints.length ? ' Takılırsan ipucu var.' : ''}`;
  const fresh = savedXp !== null;
  const workPane = (
    <>
      {split ? (
        // A band as tall as the question's title block: both sheets start on one line.
        <View style={{ minHeight: titleHeight + sl.afterTitle.tablet, justifyContent: 'flex-end' }}>
          <SectionHeader title="Çalışma masası" />
        </View>
      ) : (
        <SectionHeader title="Çalışma masası" />
      )}
      {saved ? (
        fresh ? (
          // The verdict just arrived: it eases in and the page brings it into view (spec 5.3).
          <RevealOnMount>
            <Appear>
              <AnswerStrip q={q} result={saved.result} pick={savedPick} fresh keyEditor={!lowConfidence} />
            </Appear>
          </RevealOnMount>
        ) : (
          <AnswerStrip q={q} result={saved.result} pick={savedPick} fresh={false} keyEditor={!lowConfidence} />
        )
      ) : (
        <WorkDesk
          intro
          line={line}
          actions={!solutionShown}
          hintsTotal={q.hints.length}
          hintsUsed={hintsShown}
          onHint={showHint}
          onSolution={showSolution}
        />
      )}

      {!saved ? <HintStack hints={q.hints} shown={hintsShown} /> : null}
      {/* Asked for: it types in and scrolls into view. Opened with a fresh verdict: it eases in
          under the verdict, which keeps the scroll. A past answer: it is simply there. */}
      {solutionShown || saved ? (
        <SolutionSheet markdown={solutionMarkdown(q)} typing={solutionShown || fresh} reveal={solutionShown} appear={solutionShown || fresh} />
      ) : null}

      <Button
        label={askedCount > 0 ? `Sohbete devam et (${askedCount})` : 'Anlamadım'}
        icon="message-circle-question-mark"
        variant="ghost"
        onPress={() => router.push(`/question/${q.id}/chat`)}
        style={{ alignSelf: 'flex-start' }}
      />

      <ReviewStatus q={q} />
      <AttemptHistory q={q} />

      {saved && fresh ? <Button label="Ana sayfaya dön" variant="ghost" onPress={() => router.dismissTo('/')} style={{ alignSelf: 'flex-start' }} /> : null}
    </>
  );

  // ---- The dock: answer from anywhere on the page; afterwards, the next step. ------------
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
        <DockSubmit
          ready={!!picked}
          loading={busy}
          onSubmit={() => picked && save({ choice: picked })}
          secondary={{ label: 'Boş bırak', icon: 'circle-minus', onPress: () => save({ result: 'blank' }) }}
        />
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
  } else if (fresh) {
    dock = (
      <AnswerDock>
        <DockStatus
          title={saved.result === 'correct' ? 'Doğru!' : 'Tekrara eklendi'}
          tone={saved.result === 'correct' ? theme.colors.success : theme.colors.text}
          xp={savedXp}
          answer={graded ? { labels, picked: savedPick, correct: key } : null}
        />
        <Button label="Yeni soru" icon="camera" onPress={() => router.replace('/camera')} style={{ flexShrink: 0 }} />
      </AnswerDock>
    );
  }

  // Large windows: the question sheet stays in view on the left while the desk scrolls.
  if (split) {
    return (
      <>
        {title}
        <SplitScreen left={questionPane} right={workPane} dock={dock} />
      </>
    );
  }

  return (
    <Screen safeTop={false} width="readable" dock={dock} title={heading} subtitle={subheading}>
      {title}
      {questionPane}
      {workPane}
    </Screen>
  );
}
