import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
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

/** A spot on screen, in window coordinates. */
export interface BurstRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function Particle({ index, count, progress, color, distance }: {
  index: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
  distance: number;
}) {
  const { confetti } = useTheme().layout;
  // An upward fan (-160° to -20°) with a small per-index wobble, varied reach and spin;
  // gravity pulls each piece back down at the end.
  const angle = -Math.PI * (0.11 + 0.78 * (index / (count - 1))) + (((index * 37) % 7) - 3) / 30;
  const reach = distance * (0.65 + ((index * 53) % 7) / 14);
  const spin = (index % 2 ? 1 : -1) * (160 + ((index * 29) % 5) * 50);
  const wide = index % 3 !== 1;
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35,
      transform: [
        { translateX: Math.cos(angle) * reach * t },
        { translateY: Math.sin(angle) * reach * t + distance * 0.6 * t * t },
        { rotate: `${spin * t}deg` },
        { scale: 1 - 0.35 * t },
      ],
    };
  });
  const w = wide ? confetti.long : confetti.dot;
  const h = wide ? confetti.short : confetti.dot;
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: wide ? confetti.radius : h / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface Props {
  /** The answer row (or button) the burst comes from. */
  at: BurstRect;
  xp?: number;
  onDone: () => void;
}

/**
 * A small, local celebration for a right answer: confetti puffs out of the row's letter
 * and the earned XP floats up from its right edge. No scrim; the page stays readable.
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
    burst.value = withTiming(1, { duration: spec.ms, easing: Easing.out(Easing.cubic) });
    chip.value = withDelay(
      theme.motion.duration.fast / 2,
      withTiming(1, { duration: spec.ms * 1.3, easing: Easing.out(Easing.quad) }, (ok) => ok && runOnJS(finish)()),
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
        : [{ translateY: -rise * t }, { translateX: Math.sin(t * Math.PI) * spec.sway }, { scale: t < 0.25 ? 0.8 + 0.8 * t : 1 - 0.1 * t }],
    };
  });

  const particles = useMemo(() => Array.from({ length: spec.particles }, (_, i) => i), [spec.particles]);
  // Confetti from the letter disc at the row's left; XP from its right edge.
  const originX = at.x + Math.min(at.width / 2, spec.letterInset);
  const originY = at.y + at.height / 2;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {!reduceMotion ? (
        <View style={{ position: 'absolute', left: originX, top: originY }}>
          {particles.map((i) => (
            <Particle
              key={i}
              index={i}
              count={spec.particles}
              progress={burst}
              distance={spec.distance}
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
              left: at.x + at.width - spec.chipWidth,
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
              backgroundColor: theme.colors.xpTrack,
              boxShadow: theme.colors.shadow.raised,
            }}
          >
            <AppText weight="semibold" tint={theme.colors.xpText}>
              +{xp} XP
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
