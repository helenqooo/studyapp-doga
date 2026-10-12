import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { Choice, ChoiceLabel } from '../../lib/choices';
import { useTheme } from '../../theme';

/** How the answer choices look: the picked one, the right one, a wrong pick. */
export interface ChoiceState {
  selected?: ChoiceLabel | null;
  correct?: ChoiceLabel | null;
  wrong?: ChoiceLabel | null;
  disabled?: boolean;
}

export interface MathViewProps {
  /** Markdown with $inline$ and $$display$$ LaTeX. */
  markdown: string;
  fontSize?: number;
  /** Answer choices shown as buttons under the text. */
  choices?: Choice[] | null;
  choiceState?: ChoiceState;
  onChoice?: (label: ChoiceLabel) => void;
  /**
   * `type`: new text appears word by word. `stream`: the same, and the text is still
   * arriving (an unfinished formula waits, a caret blinks). Off with reduced motion.
   */
  typing?: 'off' | 'type' | 'stream';
  /** The typing animation has caught up with a finished text. */
  onTyped?: () => void;
}

/** The JSON the page inside the WebView renders (see scripts/math-runtime.js). */
export function useMathPayload({ markdown, fontSize, choices, choiceState, typing = 'off' }: MathViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = typing !== 'off' && !reduceMotion;
  const c = theme.colors;
  return useMemo(
    () => ({
      markdown,
      choices: choices ?? null,
      choiceState: choiceState ?? null,
      typing: animate ? { animate: true, streaming: typing === 'stream' } : null,
      vars: {
        text: c.text,
        muted: c.textMuted,
        accent: c.primaryText,
        'answer-bg': c.primarySoft,
        border: c.border,
        'code-bg': c.surfaceAlt,
        surface: c.surface,
        'on-accent': c.textOnAccent,
        success: c.success,
        'success-soft': c.successSoft,
        danger: c.danger,
        'danger-soft': c.dangerSoft,
        'font-size': `${fontSize ?? theme.fontSize.md}px`,
      },
    }),
    // choiceState is compared by value so a new object with the same state doesn't re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markdown, choices, JSON.stringify(choiceState ?? null), animate, typing, fontSize, theme],
  );
}

/** Handles a message from the page; returns the new height when it reports one. */
export function handleMathMessage(
  data: unknown,
  handlers: { onChoice?: (label: ChoiceLabel) => void; onTyped?: () => void },
): number | null {
  if (typeof data !== 'string') return null;
  try {
    const msg = JSON.parse(data) as { type?: string; height?: number; label?: string };
    if (msg.type === 'height' && typeof msg.height === 'number') return msg.height;
    if (msg.type === 'choice' && typeof msg.label === 'string') handlers.onChoice?.(msg.label as ChoiceLabel);
    if (msg.type === 'typed') handlers.onTyped?.();
  } catch {
    // ignore unrelated messages
  }
  return null;
}
