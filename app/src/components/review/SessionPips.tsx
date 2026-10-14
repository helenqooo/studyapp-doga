import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AttemptResult } from '../../api/types';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble, type BubbleTone } from '../Bubble';
import { ease } from '../motion/presets';


export type PipResult = AttemptResult | null;

const TONE: Record<AttemptResult, BubbleTone> = { correct: 'success', wrong: 'danger', blank: 'neutral' };

/** One answered/unanswered question; the current one gets a graphite ring that fades in and out. */
function Pip({ result, current }: { result: PipResult; current: boolean }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const ring = useSharedValue(current ? 1 : 0);
  useEffect(() => {
    ring.value = withTiming(current ? 1 : 0, {
      duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [current, reduceMotion, ring, theme.motion.duration.base]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const sel = theme.layout.system.selectedBorder;

  return (
    <View style={{ padding: theme.layout.bubble.ringGap + sel }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            borderRadius: theme.radius.pill,
            borderWidth: sel,
            borderColor: theme.colors.mark,
          },
          ringStyle,
        ]}
      />
      <Bubble size={tablet ? 'row' : 'dot'} filled={!!result} tone={result ? TONE[result] : 'mark'} />
    </View>
  );
}

/**
 * The review session's progress as a row of optik bubbles (`row` size on a tablet, `dot` on a
 * phone): answered ones filled in success, danger or neutral (blank), the current one ringed.
 * With `current` it also shows "Soru 2/5" at heading size; without it (the done screen) it is
 * the session's tally.
 */
export function SessionPips({ results, current, style }: { results: PipResult[]; current?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const total = results.length;
  const correct = results.filter((r) => r === 'correct').length;
  const answered = results.filter(Boolean).length;
  const a11y =
    current !== undefined
      ? `Soru ${Math.min(current + 1, total)} / ${total}. ${correct} doğru.`
      : `${total} sorudan ${correct} doğru, ${answered - correct} yanlış ya da boş.`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={a11y}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' }, style]}
    >
      {current !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="label" color="textMuted">
            Soru
          </AppText>
          <AppText variant="heading" tabular>
            {Math.min(current + 1, total)}/{total}
          </AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', flexShrink: 1 }}>
        {results.map((r, i) => (
          <Pip key={i} result={r} current={i === current} />
        ))}
      </View>
    </View>
  );
}
