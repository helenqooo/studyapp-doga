import { useCallback, useMemo, useRef, useState } from 'react';
import { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Choice, ChoiceLabel } from '../../lib/choices';
import { useTheme } from '../../theme';

/** How the answer choices look: the picked one, the right one, a wrong pick. */
export interface ChoiceState {
  selected?: ChoiceLabel | null;
  correct?: ChoiceLabel | null;
  wrong?: ChoiceLabel | null;
  disabled?: boolean;
  /** The picked choice is being graded: its row seals and its letter breathes. */
  sealing?: boolean;
}

/** A graded choice row, in window coordinates (for a burst launched from it). */
export interface ChoiceVerdict {
  /** `correct`: the pick was right; `wrong`: it was wrong; `blank`: nothing was picked. */
  kind: 'correct' | 'wrong' | 'blank';
  label: ChoiceLabel;
  rect: { x: number; y: number; width: number; height: number };
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
  /** The choices just turned graded; the row the verdict is about, on screen. */
  onVerdict?: (verdict: ChoiceVerdict) => void;
}

/** `#RRGGBB` at an opacity (other color formats are returned unchanged). */
function withAlpha(color: string, alpha: number) {
  return /^#[0-9a-f]{6}$/i.test(color)
    ? `${color}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`
    : color;
}

/**
 * The view's height follows the page: the first height is set at once (and the view fades
 * in), later changes glide, so text typing in or choices turning graded never jump.
 */
export function useSmoothHeight() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const height = useSharedValue(0);
  const [shown, setShown] = useState(false);
  const first = useRef(true);
  const setHeight = useCallback(
    (next: number) => {
      if (first.current || reduceMotion) {
        first.current = false;
        height.value = next;
        setShown(true);
      } else {
        height.value = withTiming(next, { duration: theme.motion.duration.fast, easing: Easing.out(Easing.cubic) });
      }
    },
    [height, reduceMotion, theme.motion.duration.fast],
  );
  const heightStyle = useAnimatedStyle(() => ({ height: height.value }));
  return { shown, setHeight, heightStyle };
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
      motion: !reduceMotion,
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
        'success-ring': withAlpha(c.success, 0.4),
        danger: c.danger,
        'danger-soft': c.dangerSoft,
        'font-size': `${fontSize ?? theme.fontSize.md}px`,
      },
    }),
    // choiceState is compared by value so a new object with the same state doesn't re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markdown, choices, JSON.stringify(choiceState ?? null), animate, reduceMotion, typing, fontSize, theme],
  );
}

type PageRect = ChoiceVerdict['rect'];

/**
 * Handles a message from the page; returns the new height when it reports one.
 * `toWindow` turns a rect inside the page into window coordinates.
 */
export function handleMathMessage(
  data: unknown,
  handlers: { onChoice?: (label: ChoiceLabel) => void; onTyped?: () => void; onVerdict?: (verdict: ChoiceVerdict) => void },
  toWindow?: (rect: PageRect, done: (rect: PageRect) => void) => void,
): number | null {
  if (typeof data !== 'string') return null;
  try {
    const msg = JSON.parse(data) as { type?: string; height?: number; label?: string; kind?: ChoiceVerdict['kind']; rect?: PageRect };
    if (msg.type === 'height' && typeof msg.height === 'number') return msg.height;
    if (msg.type === 'choice' && typeof msg.label === 'string') handlers.onChoice?.(msg.label as ChoiceLabel);
    if (msg.type === 'typed') handlers.onTyped?.();
    if (msg.type === 'verdict' && msg.rect && msg.kind && typeof msg.label === 'string' && handlers.onVerdict) {
      const { kind, label } = msg;
      const report = (rect: PageRect) => handlers.onVerdict?.({ kind, label: label as ChoiceLabel, rect });
      if (toWindow) toWindow(msg.rect, report);
      else report(msg.rect);
    }
  } catch {
    // ignore unrelated messages
  }
  return null;
}
