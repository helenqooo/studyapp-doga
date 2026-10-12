import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';

type AppTextProps = React.ComponentProps<typeof AppText>;

interface Props extends Omit<AppTextProps, 'children'> {
  value: number;
  format?: (n: number) => string;
}

/** Counts up (or down) to `value` with an ease-out, e.g. XP and net totals. */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), ...text }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const from = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = from.current;
    const duration = theme.motion.duration.slow * 2;
    let raf = 0;
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = start + (value - start) * eased;
      setShown(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion, theme.motion.duration.slow]);

  return <AppText {...text}>{format(shown)}</AppText>;
}
