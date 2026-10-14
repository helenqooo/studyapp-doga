import { useState } from 'react';
import { View } from 'react-native';
import { useSetAnswerKey } from '../api/hooks';
import type { Question } from '../api/types';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Bubble } from './Bubble';
import { Button } from './Button';
import { PressableScale } from './motion/PressableScale';

/**
 * "Cevap anahtarı farklı mı?": the student codes the letter from their answer key when the
 * solution got it wrong (an optik row: the chosen letter is scribbled in). The first answer
 * is graded again on the server.
 */
export function AnswerKeyEditor({ q, initiallyOpen = false }: { q: Question; initiallyOpen?: boolean }) {
  const theme = useTheme();
  const setKey = useSetAnswerKey(q.id);
  const { touch } = useWindowLayout();
  const [open, setOpen] = useState(initiallyOpen);
  if (!q.choices?.length) return null;
  // The pressed letter is coded at once (the bubble scribbles in) while the server re-grades;
  // on an error it falls back to the saved key.
  const pending = setKey.isPending && setKey.variables !== undefined ? (setKey.variables ?? q.correctChoice) : undefined;
  const current = pending ?? q.answerKey ?? q.correctChoice;
  const { bubble } = theme.layout;

  if (!open) {
    return (
      <Button
        label={q.answerKey ? `Cevap anahtarı ${q.answerKey}, değiştir` : 'Cevap anahtarı farklı mı?'}
        icon="key-round"
        variant="ghost"
        onPress={() => setOpen(true)}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label" color="textMuted">
        Cevap anahtarındaki şık{q.correctChoice ? ` (çözüm ${q.correctChoice} dedi)` : ''}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Cevap anahtarı" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.xxs }}>
        {q.choices.map(({ label }) => {
          const active = current === label;
          return (
            <PressableScale
              key={label}
              kind="bubble"
              accessibilityRole="radio"
              accessibilityLabel={`Cevap anahtarı ${label}`}
              accessibilityState={{ checked: active, disabled: setKey.isPending }}
              disabled={setKey.isPending}
              onPress={() => {
                if (active) return;
                haptics.grain();
                // Picking the model's own letter clears the override.
                setKey.mutate(label === q.correctChoice ? null : label, { onError: () => haptics.error() });
              }}
              style={{ minWidth: touch, minHeight: touch, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: bubble.letter.w, height: bubble.letter.h }}>
                <Bubble size="letter" filled={active}>
                  {label}
                </Bubble>
              </View>
            </PressableScale>
          );
        })}
      </View>
      {setKey.isError ? <AppText color="danger">{setKey.error.message}</AppText> : null}
      <AppText variant="caption" color="textMuted">
        Cevabın bu şıkka göre yeniden değerlendirilir; tekrar listesi de ona göre güncellenir.
      </AppText>
    </View>
  );
}
