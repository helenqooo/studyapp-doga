import { useEffect, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import type { Question } from '../../api/types';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { FadeText } from '../motion/FadeText';
import { spring } from '../motion/presets';

// TOKEN-PENDING: layout.ladder.rungMin = { compact: 50, tablet: 60 } (the narrowest a rung column gets before the ladder scrolls; "30 gün" at 15 pt needs 60)
const RUNG_MIN = { compact: 50, tablet: 60 };
// TOKEN-PENDING: layout.ladder.rail = 4 (the optikSoft rail between the rung bubbles)
const RAIL = 4;

/** Which rung (index into `layout.ladder.rungs`) an interval sits on; unknown intervals round down. */
export function rungIndex(intervalDays: number, rungs: readonly number[]): number {
  let at = 0;
  rungs.forEach((r, i) => {
    if (intervalDays >= r) at = i;
  });
  return at;
}

/** Due questions per rung, from `q.review.intervalDays`. */
export function ladderCounts(questions: Question[], rungs: readonly number[]): number[] {
  const counts = rungs.map(() => 0);
  for (const q of questions) {
    if (!q.review) continue;
    counts[rungIndex(q.review.intervalDays, rungs)]! += 1;
  }
  return counts;
}

/** "1 gün" for a rung. */
export function rungLabel(days: number): string {
  return `${days} gün`;
}

interface Props {
  /** Due questions on each rung (same order as `layout.ladder.rungs`): a count above each rung; the fullest rung is filled. */
  counts?: number[];
  /** Session mode: the rung the current question sits on; a small fosfor bubble rides above it. */
  marker?: number | null;
  /** The rung the marker starts from on mount; it then slides to `marker` (a correct answer climbs one rung). */
  markerFrom?: number | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Tekrar merdiveni": the real 1 → 3 → 7 → 14 → 30-day sequence as five `row` bubbles on an
 * optikSoft rail. With `counts` it shows how many due questions sit on each interval; with
 * `marker` a small bubble marks one question's rung and slides when it moves (springs.settle;
 * Reduce Motion: it jumps). Scrolls sideways when the space is narrower than five rungs.
 */
export function Merdiven({ counts, marker = null, markerFrom = null, style }: Props) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const rungs = theme.layout.ladder.rungs;
  const rungMin = tablet ? RUNG_MIN.tablet : RUNG_MIN.compact;
  const bubble = theme.layout.bubble.row;
  const dot = theme.layout.bubble.dot;
  const [width, setWidth] = useState(0);
  const slot = width / rungs.length;

  const max = counts ? Math.max(0, ...counts) : 0;
  const fullest = max > 0 ? counts!.indexOf(max) : -1;

  // The marker's rung, as a float so it can slide between columns. It starts moving only once
  // the ladder is laid out (the marker is hidden until then) and after the sheet holding it has
  // faded in (`duration.slow`), so the climb is seen; the rung label follows it.
  const at = useSharedValue(markerFrom ?? marker ?? 0);
  const [arrived, setArrived] = useState(markerFrom ?? marker);
  const laidOut = width > 0;
  const delay = theme.motion.duration.slow;
  useEffect(() => {
    if (marker === null || !laidOut) return;
    if (reduceMotion) {
      at.value = marker;
      setArrived(marker);
      return;
    }
    at.value = withDelay(delay, withSpring(marker, spring('settle')));
    const t = setTimeout(() => setArrived(marker), delay);
    return () => clearTimeout(t);
  }, [marker, laidOut, reduceMotion, delay, at]);
  const markerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: at.value * slot + (slot - dot.w) / 2 }] }), [slot, dot.w]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const showTop = !!counts || marker !== null;
  const topH = Math.max(dot.h, theme.typography.numeric.size * theme.typography.numeric.lineRatio);

  const a11y = counts
    ? `Tekrar merdiveni. ${rungs.map((r, i) => `${rungLabel(r)}: ${counts[i] ?? 0} soru`).join(', ')}.`
    : marker !== null
      ? `Tekrar merdiveni. Bu soru ${rungLabel(rungs[marker] ?? rungs[0]!)} basamağında.`
      : 'Tekrar merdiveni';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ flexGrow: 1 }}
      accessible
      accessibilityLabel={a11y}
    >
      <View onLayout={onLayout} style={{ flexGrow: 1, minWidth: rungMin * rungs.length, gap: theme.spacing.xs }}>
        {showTop ? (
          <View style={{ height: topH, flexDirection: 'row' }}>
            {counts
              ? rungs.map((r, i) => (
                  <View key={r} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <AppText variant="numeric" color={i === fullest ? 'text' : 'textMuted'} accessible={false}>
                      {counts[i] ?? 0}
                    </AppText>
                  </View>
                ))
              : null}
            {marker !== null && width > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[{ position: 'absolute', left: 0, top: (topH - dot.h) / 2 }, markerStyle]}
              >
                <Bubble size="dot" filled tone="accent" animate={false} />
              </Animated.View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: bubble.h, flexDirection: 'row' }}>
          {/* The rail: one segment between each pair of rungs, so it never shows through a bubble. */}
          {width > 0
            ? rungs.slice(1).map((r, i) => (
                <View
                  key={r}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: (bubble.h - RAIL) / 2,
                    left: (i + 0.5) * slot + bubble.w / 2 + theme.spacing.xs,
                    width: Math.max(0, slot - bubble.w - theme.spacing.sm),
                    height: RAIL,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.optikSoft,
                  }}
                />
              ))
            : null}
          {rungs.map((r, i) => (
            <View key={r} style={{ flex: 1, alignItems: 'center' }}>
              <Bubble size="row" filled={i === fullest} animate={false} />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row' }}>
          {rungs.map((r, i) => (
            <View key={r} style={{ flex: 1, alignItems: 'center' }}>
              {/* The marker's rung label cross-fades to ink as the marker arrives. */}
              <FadeText
                variant="caption"
                tint={i === fullest || i === arrived ? theme.colors.text : theme.colors.textMuted}
                weight={i === fullest || i === arrived ? 'semibold' : 'regular'}
                numberOfLines={1}
                accessible={false}
              >
                {rungLabel(r)}
              </FadeText>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
