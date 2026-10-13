import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { ease } from '../motion/presets';

interface Props {
  correct: number;
  wrong: number;
  blank: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One share of the bar. It grows by flex (basis 0), so the segments always fill the track
 * exactly; `lead` adds the hairline gap before it, and only while it has a share, so an empty
 * segment leaves no gap behind.
 */
function Segment({ share, color, lead }: { share: number; color: string; lead: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(share);
  useEffect(() => {
    grow.value = reduceMotion ? share : withTiming(share, { duration: theme.motion.progress.fill, easing: ease('standard') });
  }, [share, reduceMotion, grow, theme.motion.progress.fill]);
  const style = useAnimatedStyle(() => ({ flexGrow: grow.value }));
  return (
    <Animated.View
      style={[{ flexBasis: 0, flexShrink: 1, height: '100%', marginLeft: lead && share > 0 ? theme.spacing.xxs : 0, backgroundColor: color }, style]}
    />
  );
}

function Legend({ value, label, color }: { value: number; label: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: color }} />
      <AppText variant="numeric" accessible={false}>
        {value}
      </AppText>
      <AppText variant="label" color="textMuted" accessible={false}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * The history's summary: one stacked bar of right, wrong and blank in soft success, danger
 * and neutral, with "12 doğru, 4 yanlış, 2 boş" under it. Segments ease to new shares.
 */
export function ResultMeter({ correct, wrong, blank, style }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const total = correct + wrong + blank;
  const share = (n: number) => (total ? n / total : 0);
  return (
    <View
      accessible
      accessibilityLabel={`${correct} doğru, ${wrong} yanlış, ${blank} boş`}
      style={[{ gap: theme.spacing.sm }, style]}
    >
      <View
        style={{
          flexDirection: 'row',
          height: theme.layout.progressHeight,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
          backgroundColor: c.xpTrack,
        }}
      >
        <Segment share={share(correct)} color={c.success} lead={false} />
        <Segment share={share(wrong)} color={c.danger} lead={correct > 0} />
        <Segment share={share(blank)} color={c.neutral} lead={correct + wrong > 0} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.lg, rowGap: theme.spacing.xs }}>
        <Legend value={correct} label="doğru" color={c.success} />
        <Legend value={wrong} label="yanlış" color={c.danger} />
        <Legend value={blank} label="boş" color={c.neutral} />
      </View>
    </View>
  );
}
