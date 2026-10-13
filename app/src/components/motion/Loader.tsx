import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';
import { useTheme } from '../../theme';

const DOTS = 3;
// One loop: the three bubbles fill in turn, then all three clear (four steps).
const STEPS = DOTS + 1;

interface Props {
  /** Bubble height (pt); the width follows the optik bubble's proportion. Default `spacing.sm`. */
  size?: number;
  /** Milliseconds per step (one bubble filling). Default `motion.duration.slow`. */
  tempo?: number;
  /** The pencil: fill and outline. Default `primaryText`; pass `onPrimary` on a primary fill. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

interface DotProps {
  t: SharedValue<number>;
  index: number;
  w: number;
  h: number;
  stroke: number;
  color: string;
  /** How long a fill takes to land, as a share of the loop. */
  land: number;
}

function Dot({ t, index, w, h, stroke, color, land }: DotProps) {
  const fillStyle = useAnimatedStyle(() => {
    const on = index / STEPS;
    const off = DOTS / STEPS;
    return {
      opacity: interpolate(t.value, [on, on + land, off, off + land], [0, 1, 1, 0], Extrapolation.CLAMP),
    };
  });
  const ellipse = { cx: w / 2, cy: h / 2, rx: w / 2 - stroke / 2, ry: h / 2 - stroke / 2 };
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Ellipse {...ellipse} fill="none" stroke={color} strokeWidth={stroke} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
        <Svg width={w} height={h}>
          <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Three small optik bubbles filling in turn: the app's "working on it" indicator (chat
 * typing, button loading). Reduce Motion: static, the first bubble filled.
 */
export function Loader({ size, tempo, color, style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const step = tempo ?? theme.motion.duration.slow;

  useEffect(() => {
    if (reduceMotion) {
      // The first bubble filled: still reads as "in progress".
      t.value = 0.5 / STEPS;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: step * STEPS, easing: Easing.linear }), -1, false);
  }, [t, reduceMotion, step]);

  const { bubble, borderWidth } = theme.layout;
  const h = size ?? theme.spacing.sm;
  const w = Math.round((h * bubble.dot.w) / bubble.dot.h);
  // The printed outline, scaled down with the bubble but never under a hairline.
  const stroke = Math.max(borderWidth, (bubble.outline * h) / bubble.dot.h);
  const tint = color ?? theme.colors.primaryText;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Yükleniyor"
      style={[{ flexDirection: 'row', gap: theme.spacing.xs, alignSelf: 'center', paddingVertical: theme.spacing.md }, style]}
    >
      {Array.from({ length: DOTS }, (_, i) => (
        <Dot key={i} t={t} index={i} w={w} h={h} stroke={stroke} color={tint} land={theme.motion.scribble.fillFade / (step * STEPS)} />
      ))}
    </View>
  );
}
