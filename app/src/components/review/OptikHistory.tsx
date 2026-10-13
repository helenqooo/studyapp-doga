import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { AttemptResult, ChoiceLabel, Question } from '../../api/types';
import { gradingKey } from '../../lib/question';
import { useTheme, type Theme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Icon, type IconName } from '../Icon';

const LETTERS: ChoiceLabel[] = ['A', 'B', 'C', 'D', 'E'];

/** Her latest attempt on a question (attempts are oldest first). */
export function lastAttempt(q: Question) {
  return q.attempts.length ? q.attempts[q.attempts.length - 1] : undefined;
}

function resultLook(theme: Theme, result: AttemptResult | undefined): { icon: IconName; color: string; label: string } {
  switch (result) {
    case 'correct':
      return { icon: 'circle-check', color: theme.colors.success, label: 'Doğru' };
    case 'wrong':
      return { icon: 'circle-x', color: theme.colors.danger, label: 'Yanlış' };
    case 'blank':
      return { icon: 'circle-minus', color: theme.colors.neutral, label: 'Boş' };
    default:
      return { icon: 'circle-dashed', color: theme.colors.textMuted, label: 'İşaretlenmedi' };
  }
}

function asLetter(value: string | null | undefined): ChoiceLabel | null {
  const v = value?.trim().toUpperCase();
  return v && (LETTERS as string[]).includes(v) ? (v as ChoiceLabel) : null;
}

/**
 * Her last mark on the optik form, in miniature: an A–E row of `dot` bubbles with her letter
 * filled, a red-pen loop around it when it was wrong and a check on the right letter.
 * Open-ended questions (no letters to show) fall back to a small result line.
 */
export function OptikHistory({ question, style }: { question: Question; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const last = lastAttempt(question);
  const key = gradingKey(question);
  const mine = asLetter(last?.userAnswer);
  const labels = question.choices?.length ? question.choices.map((c) => c.label) : LETTERS;
  const look = resultLook(theme, last?.result);

  if (!question.choices?.length || (!mine && !key) || !last) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }, style]}>
        <Icon name={look.icon} size={theme.fontSize.sm} color={look.color} />
        <AppText variant="caption" tint={look.color}>
          {look.label}
        </AppText>
      </View>
    );
  }

  const wrong = mine && key && mine !== key ? mine : null;
  const a11y = mine
    ? `Son işaretin ${mine}, ${look.label.toLocaleLowerCase('tr')}.${key && wrong ? ` Doğru cevap ${key}.` : ''}`
    : `Son cevabın ${look.label.toLocaleLowerCase('tr')}.${key ? ` Doğru cevap ${key}.` : ''}`;

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }, style]}
    >
      {labels.map((l) => {
        const isMine = mine === l;
        const isKey = key === l;
        return (
          <Bubble
            key={l}
            size="dot"
            animate={false}
            filled={isMine}
            tone={isMine && isKey ? 'success' : 'mark'}
            verdict={isMine && wrong ? 'pen' : isKey ? 'check' : undefined}
          >
            {l}
          </Bubble>
        );
      })}
    </View>
  );
}

export { resultLook };
