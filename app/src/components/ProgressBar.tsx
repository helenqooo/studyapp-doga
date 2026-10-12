import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';

interface Props {
  /** 0..1 */
  progress: number;
  /** Raw color token values; default to the XP colors. */
  color?: string;
  trackColor?: string;
  height?: number;
  /** Value (0..1) to animate from on mount; default empty. */
  from?: number;
  style?: StyleProp<ViewStyle>;
}

/** Bar that fills from empty on mount and glides to every new value. */
export function ProgressBar({ progress, color, trackColor, height, from, style }: Props) {
  const theme = useTheme();
  const h = height ?? theme.layout.progressHeight;
  const toPct = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100);
  const pct = toPct(progress);
  const width = useSharedValue(from === undefined ? 0 : toPct(from));

  useEffect(() => {
    width.value = withTiming(pct, { duration: theme.motion.duration.slow * 2, easing: Easing.out(Easing.cubic) });
  }, [pct, width, theme.motion.duration.slow]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[
        { height: h, borderRadius: theme.radius.pill, backgroundColor: trackColor ?? theme.colors.xpTrack, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[{ height: '100%', borderRadius: theme.radius.pill, backgroundColor: color ?? theme.colors.xp }, fillStyle]} />
    </View>
  );
}
