import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The logo's open ring: a 310° arc, clockwise from −20°, leaving the gap at the top right. */
const ARC_DEG = 310;
const ARC_START_DEG = -20;

export interface RingValue {
  /** 0–1; above 1 counts as closed. */
  progress: number;
  color: string;
}

function Ring({ value, radius, stroke, size, index }: { value: RingValue; radius: number; stroke: number; size: number; index: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * radius;
  const arc = (circumference * ARC_DEG) / 360;
  const target = Math.min(1, Math.max(0, value.progress));
  const progress = useSharedValue(0);
  // A ring that closes keeps going round to a full circle, like the logo's dot sliding
  // into the gap.
  const closed = target >= 1;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = closed ? 1 + (360 - ARC_DEG) / ARC_DEG : target;
      return;
    }
    const full = 1 + (360 - ARC_DEG) / ARC_DEG;
    progress.value = withDelay(
      index * theme.motion.stagger * 3,
      closed
        ? withSpring(full, theme.motion.spring)
        : withTiming(target, { duration: theme.motion.duration.slow * 2, easing: Easing.out(Easing.cubic) }),
    );
  }, [target, closed, index, progress, reduceMotion, theme.motion]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: Math.max(0, arc * (1 - progress.value)) }));
  const center = size / 2;
  return (
    <G rotation={ARC_START_DEG} origin={`${center}, ${center}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={theme.colors.surfaceAlt}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${arc} ${circumference}`}
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={value.color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${arc} ${circumference}`}
        animatedProps={props}
      />
    </G>
  );
}

/**
 * Today's three goals as concentric rings in the shape of the Lumi mark (outer first).
 * Each ring fills along the logo's arc; a finished one closes into a full circle.
 */
export function TodayRings({ rings, size: sizeProp }: { rings: RingValue[]; size?: number }) {
  const theme = useTheme();
  const { stroke, gap } = theme.layout.todayRings;
  const size = sizeProp ?? theme.layout.todayRings.size;
  const outer = (size - stroke) / 2;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        {rings.map((ring, i) => (
          <Ring key={i} value={ring} radius={outer - i * (stroke + gap)} stroke={stroke} size={size} index={i} />
        ))}
      </Svg>
    </View>
  );
}
