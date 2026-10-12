import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { LOGO_DOT, LOGO_RING } from '../Logo';

/**
 * The Netlik mark, slowly turning and breathing, shown while the AI reads or writes
 * (solving a question, reading a karne, answering in chat): the ring "focusing".
 */
export function ThinkingSpark({ size, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const s = size ?? theme.layout.spark;
  const spin = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(1, { duration: theme.motion.duration.celebrate * 4, easing: Easing.linear }), -1);
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: theme.motion.duration.celebrate / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: theme.motion.duration.celebrate / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [breath, spin, reduceMotion, theme.motion.duration.celebrate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.86 + 0.14 * breath.value }],
    opacity: 0.75 + 0.25 * breath.value,
  }));

  const fill = color ?? theme.colors.accent;
  return (
    <Animated.View style={[{ width: s, height: s, alignSelf: 'center' }, style]} accessibilityLabel="Düşünüyor">
      <Svg width={s} height={s} viewBox="13 13 74 74">
        <Path d={LOGO_RING} fill="none" stroke={fill} strokeWidth={14} strokeLinecap="round" />
        <Circle {...LOGO_DOT} fill={fill} />
      </Svg>
    </Animated.View>
  );
}
