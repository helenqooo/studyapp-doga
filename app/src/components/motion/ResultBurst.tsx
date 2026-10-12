import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Mascot } from '../mascot/Mascot';

export type BurstKind = 'correct' | 'wrong' | 'blank';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Glyph strokes on a 24-unit grid, drawn one after another. */
const GLYPHS: Record<BurstKind, { d: string; length: number }[]> = {
  correct: [{ d: 'M6.5 12.5 L10.5 16.5 L17.5 8.5', length: 16.3 }],
  wrong: [
    { d: 'M7.5 7.5 L16.5 16.5', length: 12.8 },
    { d: 'M16.5 7.5 L7.5 16.5', length: 12.8 },
  ],
  blank: [{ d: 'M7 12 L17 12', length: 10 }],
};

const PARTICLES = 18;

function Stroke({ d, length, draw, from, to, color, width }: {
  d: string;
  length: number;
  draw: SharedValue<number>;
  from: number;
  to: number;
  color: string;
  width: number;
}) {
  const props = useAnimatedProps(() => {
    const t = Math.min(1, Math.max(0, (draw.value - from) / (to - from)));
    return { strokeDashoffset: length * (1 - t) };
  });
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={`${length} ${length}`}
      animatedProps={props}
    />
  );
}

function Particle({ index, progress, color, distance }: {
  index: number;
  progress: SharedValue<number>;
  color: string;
  distance: number;
}) {
  const { confetti } = useTheme().layout;
  // Deterministic spread: even angles with a small per-index wobble, varied reach and spin.
  const angle = (index / PARTICLES) * Math.PI * 2 + ((index * 37) % 11) / 20;
  const reach = distance * (0.7 + ((index * 53) % 7) / 14);
  const spin = ((index % 2 ? 1 : -1) * (180 + ((index * 29) % 5) * 60));
  const wide = index % 3 === 0;
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const x = Math.cos(angle) * reach * t;
    const y = Math.sin(angle) * reach * t + distance * 0.35 * t * t;
    return {
      opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${spin * t}deg` }, { scale: 1 - 0.4 * t }],
    };
  });
  const w = wide ? confetti.long : confetti.dot;
  const h = wide ? confetti.short : confetti.dot;
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: w, height: h, borderRadius: wide ? confetti.radius : h / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface Props {
  kind: BurstKind;
  xp?: number;
  /** New level reached with this action, if any. */
  levelUp?: number | null;
  onDone: () => void;
}

/**
 * Full-screen, non-interactive celebration: a badge pops in, its check (or cross)
 * draws itself, confetti bursts for a correct answer and the earned XP floats up.
 */
export function ResultBurst({ kind, xp, levelUp, onDone }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { duration, springBouncy, shake: shakeSpec } = theme.motion;
  const size = theme.layout.resultBadge;

  const pop = useSharedValue(0);
  const draw = useSharedValue(0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);
  const float = useSharedValue(0);
  const shake = useSharedValue(0);
  const fade = useSharedValue(1);

  const fill =
    kind === 'correct' ? theme.colors.successStrong : kind === 'wrong' ? theme.colors.dangerStrong : theme.colors.neutralStrong;
  const soft = kind === 'correct' ? theme.colors.successSoft : kind === 'wrong' ? theme.colors.dangerSoft : theme.colors.neutralSoft;
  const glyph = GLYPHS[kind];
  const total = duration.celebrate + (levelUp ? duration.slow * 2 : 0);

  useEffect(() => {
    const finish = () => onDone();
    if (reduceMotion) {
      // Plain fades. Opt out of the system override, which would otherwise skip the
      // delay and finish every timing at once, unmounting the burst before it shows.
      const fadeOnly = { duration: duration.base, reduceMotion: ReduceMotion.Never };
      pop.value = withTiming(1, fadeOnly);
      draw.value = 1;
      float.value = 1;
      fade.value = withDelay(total - duration.base, withTiming(0, fadeOnly, (ok) => ok && runOnJS(finish)()), ReduceMotion.Never);
      return;
    }
    pop.value = withSpring(1, springBouncy);
    draw.value = withDelay(duration.fast, withTiming(1, { duration: duration.slow, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(duration.fast, withTiming(1, { duration: duration.slow * 2, easing: Easing.out(Easing.quad) }));
    if (kind === 'correct') {
      burst.value = withDelay(duration.fast, withTiming(1, { duration: duration.celebrate * 0.75, easing: Easing.out(Easing.cubic) }));
    }
    if (kind === 'wrong') {
      const [a, b, c, d] = shakeSpec.steps;
      shake.value = withDelay(
        duration.slow,
        withSequence(
          withTiming(1, { duration: a }),
          withTiming(-1, { duration: b }),
          withTiming(0.6, { duration: c }),
          withTiming(0, { duration: d }),
        ),
      );
    }
    float.value = withDelay(duration.base, withTiming(1, { duration: duration.slow * 1.5, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(
      total - duration.slow,
      withTiming(0, { duration: duration.slow, easing: Easing.in(Easing.quad) }, (ok) => ok && runOnJS(finish)()),
    );
    // Run once per mount; the provider remounts the burst for every celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.5) }));
  const shakeDistance = shakeSpec.distance;
  // With Reduce Motion the badge only fades (no zoom).
  const minScale = reduceMotion ? 1 : 0.4;
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: minScale + (1 - minScale) * pop.value }, { translateX: shake.value * shakeDistance }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ring.value),
    transform: [{ scale: 1 + 0.7 * ring.value }],
  }));
  const xpStyle = useAnimatedStyle(() => ({
    opacity: float.value,
    transform: [{ translateY: (1 - float.value) * theme.spacing.xl }],
  }));

  const particles = useMemo(() => Array.from({ length: PARTICLES }, (_, i) => i), []);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.celebrationScrim }, scrimStyle]} />
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {kind === 'correct' && !reduceMotion
          ? particles.map((i) => (
              <Particle key={i} index={i} progress={burst} distance={size * 1.5} color={theme.colors.confetti[i % theme.colors.confetti.length]} />
            ))
          : null}
        <Animated.View
          style={[
            { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: theme.layout.shutterBorder, borderColor: fill },
            ringStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: fill,
              borderWidth: theme.layout.shutterBorder,
              borderColor: soft,
              alignItems: 'center',
              justifyContent: 'center',
            },
            badgeStyle,
          ]}
        >
          <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
            {glyph.map((g, i) => (
              <Stroke
                key={i}
                d={g.d}
                length={g.length}
                draw={draw}
                from={i / glyph.length}
                to={(i + 1) / glyph.length}
                color={theme.colors.textOnAccent}
                width={theme.layout.resultStroke}
              />
            ))}
          </Svg>
        </Animated.View>
      </View>
      {xp || levelUp ? (
        <Animated.View style={[{ alignItems: 'center', gap: theme.spacing.xxs, marginTop: theme.spacing.lg }, xpStyle]}>
          {xp ? (
            <View
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.xpTrack,
              }}
            >
              <AppText variant="heading" tint={theme.colors.text}>
                +{xp} XP
              </AppText>
            </View>
          ) : null}
          {levelUp ? (
            <>
              <Mascot mood="proud" size={theme.layout.mascot.note} />
              <AppText variant="title" tint={theme.colors.primaryText}>
                Seviye {levelUp}!
              </AppText>
            </>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
