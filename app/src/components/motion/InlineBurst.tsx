import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { ease } from './presets';


/** A spot on screen, in window coordinates. */
export interface BurstRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One highlighter stroke: it flies out along its own direction (a dash, not tumbling
 * confetti), stretching as it leaves and thinning as it lands, then fades.
 */
function Stroke({ index, count, progress, color, distance, w, h }: {
  index: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
  distance: number;
  w: number;
  h: number;
}) {
  // An upward fan (-160° to -20°) with a small per-index wobble and varied reach; a soft
  // gravity bends the far end down. The stroke points where it flies, tilted a little.
  const angle = -Math.PI * (0.11 + 0.78 * (index / (count - 1))) + (((index * 37) % 7) - 3) / 30;
  const reach = distance * (0.62 + ((index * 53) % 7) / 16);
  const tilt = (angle * 180) / Math.PI + (((index * 29) % 5) - 2) * 4;
  const drift = (index % 2 ? 1 : -1) * (6 + ((index * 17) % 4) * 3);
  const theme = useTheme();
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: theme.opacity.burstStroke * (t < 0.12 ? t / 0.12 : t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4)),
      transform: [
        { translateX: Math.cos(angle) * reach * t },
        { translateY: Math.sin(angle) * reach * t + distance * 0.45 * t * t },
        { rotate: `${tilt + drift * t}deg` },
        { scaleX: t < 0.3 ? 0.4 + 2 * t : 1 - 0.3 * (t - 0.3) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: h / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface Props {
  /** The answer row, letter (or button) the burst comes from. */
  at: BurstRect;
  xp?: number;
  onDone: () => void;
}

/**
 * A small, local celebration for a right answer: twelve soft highlighter strokes puff out
 * of the row's letter (or the coded letter in the dock) and the earned XP floats up on a
 * fosfor chip. No scrim, no flash; the page stays readable.
 */
export function InlineBurst({ at, xp, onDone }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const spec = theme.motion.inlineBurst;
  const burst = useSharedValue(0);
  const chip = useSharedValue(0);

  useEffect(() => {
    const finish = () => onDone();
    if (reduceMotion) {
      // The XP fades in and out where it is.
      chip.value = withTiming(1, { duration: spec.ms * 1.4, reduceMotion: ReduceMotion.Never }, (ok) => ok && runOnJS(finish)());
      return;
    }
    burst.value = withTiming(1, { duration: spec.ms, easing: ease('enter') });
    chip.value = withDelay(
      theme.motion.duration.fast / 2,
      withTiming(1, { duration: spec.ms * 1.3, easing: ease('standard') }, (ok) => ok && runOnJS(finish)()),
    );
    // Once per mount; the host mounts a new burst each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rise = spec.rise;
  const chipStyle = useAnimatedStyle(() => {
    const t = chip.value;
    return {
      opacity: t < 0.2 ? t / 0.2 : t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1,
      transform: reduceMotion
        ? []
        : [{ translateY: -rise * t }, { translateX: Math.sin(t * Math.PI) * spec.sway }, { scale: t < 0.25 ? 0.9 + 0.4 * t : 1 - 0.06 * t }],
    };
  });

  const strokes = useMemo(() => Array.from({ length: spec.particles }, (_, i) => i), [spec.particles]);
  // Strokes from the letter at the row's left (a lone letter: its middle); XP from the right edge.
  const originX = at.x + Math.min(at.width / 2, spec.letterInset);
  const originY = at.y + at.height / 2;
  const { w: sw, h: sh } = spec.stroke;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {!reduceMotion ? (
        <View style={{ position: 'absolute', left: originX, top: originY }}>
          {strokes.map((i) => (
            <Stroke
              key={i}
              index={i}
              count={spec.particles}
              progress={burst}
              distance={spec.distance}
              // Three lengths and two weights, so the puff reads hand-made.
              w={sw * (1 + (i % 3) * 0.5)}
              h={sh + (i % 2)}
              color={theme.colors.confetti[i % theme.colors.confetti.length]!}
            />
          ))}
        </View>
      ) : null}
      {xp ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              // A row: over its right edge. A lone letter (narrower than two chips): centered over it.
              left: at.width < spec.chipWidth * 2 ? at.x + (at.width - spec.chipWidth) / 2 : at.x + at.width - spec.chipWidth,
              top: at.y - theme.spacing.md,
              width: spec.chipWidth,
              alignItems: 'center',
            },
            chipStyle,
          ]}
        >
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              borderCurve: 'continuous',
              backgroundColor: theme.colors.highlight,
              boxShadow: theme.colors.shadow.raised,
            }}
          >
            <AppText variant="label" weight="semibold" tint={theme.colors.highlightInk} tabular>
              +{xp} XP
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
