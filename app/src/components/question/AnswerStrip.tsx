import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { AttemptResult, ChoiceLabel, Question } from '../../api/types';
import { gradingKey, isGradedChoice, RESULT_LABELS } from '../../lib/question';
import { useTheme } from '../../theme';
import { AnswerKeyEditor } from '../AnswerKeyEditor';
import { AppText } from '../AppText';
import { Bubble, type BubbleTone, type BubbleVerdict } from '../Bubble';
import { Card } from '../Card';
import { useCompanionYield } from '../companion/Perch';
import { Mascot } from '../mascot/Mascot';
import { FadeText } from '../motion/FadeText';

interface Props {
  q: Question;
  result: AttemptResult;
  /** Her coded letter (null: blank, or no choices). */
  pick: ChoiceLabel | null;
  /** Answered on this visit: the strip codes itself in and the marks draw. */
  fresh: boolean;
  /** Offer "Cevap anahtarı farklı mı?" here (off when the low-confidence sheet already has it). */
  keyEditor: boolean;
}

/** What the saved answer says, in one line and an optional kind word after it. */
function verdictCopy(q: Question, result: AttemptResult, pick: ChoiceLabel | null) {
  const key = gradingKey(q);
  if (isGradedChoice(q)) {
    const title = result === 'correct' ? `Doğru! Cevap ${key}.` : result === 'wrong' ? `${pick} dedin, doğrusu ${key}.` : `Boş bıraktın. Doğrusu ${key}.`;
    const detail = result === 'wrong' ? 'Üzülme, birlikte toparlarız: bu soru tekrar listende, yarın yeniden deneyeceğiz.' : null;
    return { title, detail };
  }
  return { title: `Kaydedildi: ${RESULT_LABELS[result]}${pick ? ` (cevabın: ${pick})` : ''}`, detail: null };
}

/**
 * "Senin cevabın": after the verdict this goes to the top of the desk. The A–E optik strip
 * shows her mark (a check on the right letter, the red pen around a wrong pick), the verdict
 * Lumi and the line that goes with it, then the answer-key fix.
 */
export function AnswerStrip({ q, result, pick, fresh, keyEditor }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  // The verdict Lumi is in-tree: the companion steps aside (one Lumi per screen).
  useCompanionYield();
  const graded = isGradedChoice(q);
  const key = graded ? gradingKey(q) : null;
  const labels = q.choices?.map((ch) => ch.label) ?? [];
  const { title, detail } = verdictCopy(q, result, pick);
  const tone = { correct: c.success, wrong: c.danger, blank: c.textMuted }[result];
  // Lumi cheers a right answer, is sad with you about a wrong one, ponders a blank.
  const mood = result === 'correct' ? 'celebrate' : result === 'wrong' ? 'sad' : 'thinking';

  // A fresh answer codes itself in: the scribble first, then the check or the red pen.
  const [stage, setStage] = useState(fresh ? 0 : 2);
  useEffect(() => {
    if (!fresh) return;
    const { slow } = theme.motion.duration;
    const { ms, fillFade } = theme.motion.scribble;
    const a = setTimeout(() => setStage(1), slow);
    const b = setTimeout(() => setStage(2), slow + ms + fillFade);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [fresh, theme.motion.duration, theme.motion.scribble]);

  const strip = labels.length ? (
    <View
      accessible
      accessibilityLabel={`Şıklar. ${pick ? `Senin cevabın ${pick}` : 'Boş bıraktın'}${key ? `, doğru cevap ${key}` : ''}.`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}
    >
      {labels.map((l) => {
        const mine = pick === l;
        const right = key === l;
        let verdict: BubbleVerdict | undefined;
        if (graded && right) verdict = 'check';
        else if (graded && mine) verdict = 'pen';
        const bubbleTone: BubbleTone = mine && right ? 'success' : 'mark';
        return (
          <Bubble key={l} size="letter" filled={mine && stage >= 1} tone={bubbleTone} verdict={stage >= 2 ? verdict : undefined}>
            {l}
          </Bubble>
        );
      })}
    </View>
  ) : null;

  return (
    <Card title="Senin cevabın">
      {strip}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Mascot mood={mood} size={theme.layout.mascot.note} />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <FadeText weight="semibold" tint={tone}>
            {title}
          </FadeText>
          {detail ? (
            <AppText variant="label" color="textMuted">
              {detail}
            </AppText>
          ) : null}
          {fresh && result !== 'correct' && !detail ? (
            <AppText variant="label" color="textMuted">
              Bu soru tekrar listene eklendi. Yarın karşına çıkacak.
            </AppText>
          ) : null}
        </View>
      </View>
      {keyEditor ? <AnswerKeyEditor q={q} /> : null}
    </Card>
  );
}
