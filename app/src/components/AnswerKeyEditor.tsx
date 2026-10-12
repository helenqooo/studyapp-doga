import { useState } from 'react';
import { View } from 'react-native';
import { useSetAnswerKey } from '../api/hooks';
import type { Question } from '../api/types';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { PressableScale } from './motion/PressableScale';

/**
 * "Cevap anahtarı farklı mı?": the student sets the letter from their answer key when the
 * solution got it wrong. The first answer is graded again on the server.
 */
export function AnswerKeyEditor({ q, initiallyOpen = false }: { q: Question; initiallyOpen?: boolean }) {
  const theme = useTheme();
  const setKey = useSetAnswerKey(q.id);
  const [open, setOpen] = useState(initiallyOpen);
  if (!q.choices?.length) return null;
  const current = q.answerKey ?? q.correctChoice;

  if (!open) {
    return (
      <Button
        label={q.answerKey ? `Cevap anahtarı: ${q.answerKey} · değiştir` : 'Cevap anahtarı farklı mı?'}
        icon="key-round"
        variant="ghost"
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label" color="textMuted">
        Cevap anahtarındaki şık{q.correctChoice ? ` (çözüm ${q.correctChoice} dedi)` : ''}
      </AppText>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {q.choices.map(({ label }) => {
          const active = current === label;
          return (
            <PressableScale
              key={label}
              accessibilityRole="radio"
              accessibilityLabel={`Cevap anahtarı ${label}`}
              accessibilityState={{ selected: active, disabled: setKey.isPending }}
              disabled={setKey.isPending}
              onPress={() => {
                haptics.select();
                // Picking the model's own letter clears the override.
                setKey.mutate(label === q.correctChoice ? null : label, { onError: () => haptics.error() });
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
              <AppText weight="semibold" tint={active ? theme.colors.textOnAccent : theme.colors.text}>
                {label}
              </AppText>
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
