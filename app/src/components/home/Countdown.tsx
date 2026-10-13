import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { YKS_DATE } from '../../data/exam';
import { daysBetween, localToday } from '../../lib/format';
import { useContentSize, useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { FocusPull } from '../motion/FocusPull';
import { useHomeDay } from './homeDay';
import { Marked } from './Marked';

// TOKEN-PENDING: typography.figureDrop = 0.02 (how far Barlow figures sit above their line box bottom, as a share of the size; aligns labels beside a big number)
export const FIGURE_DROP = 0.02;

/** Days left to YKS (0 once it has passed). */
export function daysToYks(): number {
  return Math.max(0, daysBetween(localToday(), YKS_DATE));
}

/**
 * Home's header right: "YKS'ye 249 gün", the number in `hero` (tablet) with the day's one
 * focus pull and Lumi's `home.countdown` highlight. Inside the screen's compact bar (which
 * has no measured content width) it repeats small, without the highlight.
 */
export function Countdown() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const { width } = useContentSize();
  const left = daysToYks();
  if (left <= 0) return null;
  if (width === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }} accessibilityLabel={`YKS'ye ${left} gün`}>
        <AppText variant="numeric">{left}</AppText>
        <AppText variant="caption" color="textMuted">
          gün
        </AppText>
      </View>
    );
  }
  return <HeaderCountdown days={left} tablet={tablet} />;
}

function HeaderCountdown({ days, tablet }: { days: number; tablet: boolean }) {
  const theme = useTheme();
  const memo = useHomeDay();
  const { update } = memo;
  // Decided once per mount: the first Home open of the day pulls focus, revisits don't.
  const play = useRef<boolean | null>(null);
  if (play.current === null && memo.ready) play.current = !memo.pulled;
  useEffect(() => {
    if (play.current) update({ pulled: true });
  }, [memo.ready, update]);

  // The title row is one title line tall; the number is centred on the title and the
  // caption under it, so it overhangs the row instead of pushing the caption down.
  const type = theme.typography;
  const size = (v: keyof typeof type) => (tablet ? type[v].sizeTablet : type[v].size);
  const variant = tablet ? 'hero' : 'stat';
  const titleLine = Math.round(size('title') * type.title.lineRatio);
  const numberLine = Math.round(size(variant) * type[variant].lineRatio);
  const blockLine = titleLine + theme.spacing.xs + Math.round(size('body') * type.body.lineRatio);
  const overhang = Math.max(0, numberLine - titleLine);
  const lift = tablet ? Math.round((numberLine - blockLine) / 2) : 0;
  const drop = Math.round(size(variant) * FIGURE_DROP);

  return (
    <View style={{ height: titleLine, justifyContent: 'flex-start' }} accessible accessibilityLabel={`YKS'ye ${days} gün`}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
          marginTop: -lift - (tablet ? 0 : overhang / 2),
        }}
      >
        <AppText variant="label" color="textMuted" style={{ marginBottom: drop }}>
          YKS'ye
        </AppText>
        <Marked id="home.countdown">
          <FocusPull text={String(days)} variant={variant} play={play.current === true} />
        </Marked>
        <AppText variant="label" color="textMuted" style={{ marginBottom: drop }}>
          gün
        </AppText>
      </View>
    </View>
  );
}
