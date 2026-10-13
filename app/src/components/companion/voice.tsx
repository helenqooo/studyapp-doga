import { useEffect, useState, type ComponentProps } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useCompanionStore, type CompanionLine } from '../../store/companionStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';

/**
 * For Home's hero note, which *is* Lumi's voice (spec 6.5): while mounted, the companion's
 * floating note steps aside on Home and the current line is returned here instead (null when
 * Lumi has nothing to say; show `homeLine(ctx)` then). A line arrives only once Lumi says it,
 * after its flight or hop (spec 1.2 step 5), not while it is still on the way. The companion
 * still times the line out, so the hero falls back on its own when the line is dismissed.
 */
export function useHeroVoice(active = true): CompanionLine | null {
  const line = useCompanionStore((s) => (s.current && s.speakingId === s.current.id ? s.current : null));
  const shown = useCompanionStore((s) => s.heroVoice > 0);
  useEffect(() => {
    if (!active) return;
    useCompanionStore.setState((s) => ({ heroVoice: s.heroVoice + 1 }));
    return () => useCompanionStore.setState((s) => ({ heroVoice: Math.max(0, s.heroVoice - 1) }));
  }, [active]);
  return active && shown ? line : null;
}

/**
 * A line that re-types itself word by word when `text` changes (22 ms a word, at most
 * 600 ms in all). Reduce Motion shows it at once.
 */
export function TypedLine({ text, ...rest }: { text: string } & Omit<ComponentProps<typeof AppText>, 'children'>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');
  // Starts from the first word (not the whole line), so a new line never flashes in full first.
  const [count, setCount] = useState(reduceMotion ? words.length : Math.min(1, words.length));

  useEffect(() => {
    const all = text.split(' ').length;
    if (reduceMotion) {
      setCount(all);
      return;
    }
    const { typePerWordMs, typeMaxMs } = theme.motion.companion;
    const step = Math.min(typePerWordMs, typeMaxMs / Math.max(1, all));
    if (all <= 1) {
      setCount(all);
      return;
    }
    setCount(1);
    let n = 1;
    const id = setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= all) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, [text, reduceMotion, theme.motion.companion]);

  // The untyped words are laid out in clear ink, so the note never reflows while typing.
  const typed = words.slice(0, count).join(' ');
  const left = words.slice(count).join(' ');
  return (
    <AppText {...rest} accessibilityLabel={text}>
      {typed}
      {left ? <AppText {...rest} tint={theme.colors.transparent}>{` ${left}`}</AppText> : null}
    </AppText>
  );
}
