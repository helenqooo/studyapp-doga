import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { YKS_DATE } from '../../data/exam';
import { daysBetween, localToday } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { FocusPull } from '../motion/FocusPull';
import { useHomeDay } from './homeDay';
import { Highlight } from '../Highlight';
import { useCompactHeader } from '../Screen';


/** Days left to YKS (0 once it has passed). */
export function daysToYks(): number {
  return Math.max(0, daysBetween(localToday(), YKS_DATE));
}

/**
 * Home's header right: "YKS'ye 248 gün" on the title's line, the number in the title's Lora
 * size so it shares the title's baseline, with the day's one focus pull and Lumi's
 * `home.countdown` highlight. `short` drops "YKS'ye" (a narrow window, so the title keeps one
 * line). Inside the screen's compact bar it repeats small, without the highlight.
 */
export function Countdown({ short = false }: { short?: boolean }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const compact = useCompactHeader();
  const left = daysToYks();
  if (left <= 0) return null;
  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }} accessibilityLabel={`YKS'ye ${left} gün`}>
        <AppText variant="numeric">{left}</AppText>
        <AppText variant="caption" color="textMuted">
          gün
        </AppText>
      </View>
    );
  }
  return <HeaderCountdown days={left} tablet={tablet} short={short} />;
}

function HeaderCountdown({ days, tablet, short }: { days: number; tablet: boolean; short: boolean }) {
  const theme = useTheme();
  const memo = useHomeDay();
  const { update } = memo;
  // Decided once per mount: the first Home open of the day pulls focus, revisits don't.
  const play = useRef<boolean | null>(null);
  if (play.current === null && memo.ready) play.current = !memo.pulled;
  useEffect(() => {
    if (play.current) update({ pulled: true });
  }, [memo.ready, update]);

  // The number is set in `title`, one title line tall, so the title row (which centres its
  // actions) puts it on the title's baseline; the labels drop to the figure's baseline.
  const size = tablet ? theme.typography.title.sizeTablet : theme.typography.title.size;
  const drop = Math.round(size * theme.typography.figureDrop);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}
      accessible
      accessibilityLabel={`YKS'ye ${days} gün`}
    >
      {short ? null : (
        <AppText variant="label" color="textMuted" style={{ marginBottom: drop }}>
          YKS'ye
        </AppText>
      )}
      <Highlight id="home.countdown">
        <FocusPull text={String(days)} variant="title" play={play.current === true} />
      </Highlight>
      <AppText variant="label" color="textMuted" style={{ marginBottom: drop }}>
        gün
      </AppText>
    </View>
  );
}
