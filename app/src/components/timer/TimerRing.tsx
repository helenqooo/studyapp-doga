import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { TimerPhase } from '../../store/timerStore';
import { useTheme } from '../../theme';
import { CompanionPerch } from '../companion/Perch';
import type { MascotMood } from '../mascot/Mascot';
import { ease } from '../motion/presets';

// TOKEN-PENDING: layout.timer.tickGap = 6 (space between the track's inner edge and the ticks)
const TICK_GAP = 6;
// TOKEN-PENDING: layout.timer.tickWidth = { major: 2, minor: 1.5 }
const TICK_WIDTH = { major: 2, minor: 1.5 };
// TOKEN-PENDING: layout.timer.majorEvery = 5 (a major tick every 5 minutes)
const MAJOR_EVERY = 5;
// TOKEN-PENDING: layout.timer.ticks = { min: 5, max: 60 } (one tick per planned minute, within these)
const TICKS = { min: 5, max: 60 };
// TOKEN-PENDING: motion.timer.headGlow = { ms: 1300, low: 0.35, high: 0.7, scale: 2.2 } (the fosfor head's breathing halo)
const HEAD_GLOW = { ms: 1300, low: 0.35, high: 0.7, scale: 2.2 };
// TOKEN-PENDING: motion.timer.tickMs = 1000 (the arc glides across each one-second tick)
const TICK_MS = 1000;
// TOKEN-PENDING: opacity.timerPaused = 0.55 (the arc while paused)
const PAUSED_OPACITY = 0.55;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A circle as a path that starts at 12 o'clock and runs clockwise: no rotation, no `<G origin>`. */
function circlePath(c: number, r: number): string {
  return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r}`;
}

/** Every minute tick in one path per weight (major every 5), precomputed. */
function tickPaths(count: number, c: number, outer: number, major: number, minor: number) {
  let maj = '';
  let min = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const isMajor = i % MAJOR_EVERY === 0;
    const len = isMajor ? major : minor;
    const sx = Math.sin(a);
    const cy = -Math.cos(a);
    const seg = `M ${(c + sx * outer).toFixed(2)} ${(c + cy * outer).toFixed(2)} L ${(c + sx * (outer - len)).toFixed(2)} ${(c + cy * (outer - len)).toFixed(2)} `;
    if (isMajor) maj += seg;
    else min += seg;
  }
  return { maj, min };
}

interface Props {
  size: number;
  phase: TimerPhase;
  /** Share of the phase still left (0..1). */
  fraction: number;
  paused: boolean;
  /** Planned minutes: one tick each. */
  minutes: number;
  /** The still Lumi drawn at 12 o'clock when the companion doesn't perch there. */
  mood: MascotMood;
  /** The clock and its captions, centered in the ring. */
  children: ReactNode;
}

/**
 * The pomodoro ring. Idle: the minute ticks only (no misleading full ring). Focus: a graphite
 * arc burning down from 12 o'clock with a fosfor head dot; break: a green arc. The arc is a
 * precomputed path whose dash offset glides over each second; the head orbits by rotating a
 * full-size layer around its own center (the default origin, safe on iOS). Lumi perches at
 * 12 o'clock (`timer-ring`).
 */
export function TimerRing({ size, phase, fraction, paused, minutes, mood, children }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { stroke, tick, headDot } = theme.layout.timer;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const running = phase !== 'idle';
  const count = Math.min(TICKS.max, Math.max(TICKS.min, Math.round(minutes)));
  const ticks = useMemo(() => tickPaths(count, c, r - stroke / 2 - TICK_GAP, tick.major, tick.minor), [count, c, r, stroke, tick.major, tick.minor]);
  const ring = useMemo(() => circlePath(c, r), [c, r]);

  const progress = useSharedValue(fraction);
  useEffect(() => {
    progress.value = reduceMotion ? fraction : withTiming(fraction, { duration: TICK_MS, easing: Easing.linear });
  }, [fraction, progress, reduceMotion]);

  // Color and visibility changes cross-fade (no hard cuts): focus arc, break arc, the whole arc layer.
  const fadeMs = reduceMotion ? theme.motion.duration.fast : theme.motion.duration.base;
  const fade = (to: number) => withTiming(to, { duration: fadeMs, easing: ease('standard'), reduceMotion: ReduceMotion.Never });
  const shown = useSharedValue(running ? 1 : 0);
  const focusOn = useSharedValue(phase === 'break' ? 0 : 1);
  useEffect(() => {
    shown.value = fade(running ? (paused ? PAUSED_OPACITY : 1) : 0);
    focusOn.value = fade(phase === 'break' ? 0 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, phase, fadeMs]);

  const glow = useSharedValue(HEAD_GLOW.low);
  useEffect(() => {
    if (reduceMotion || phase !== 'focus' || paused) {
      cancelAnimation(glow);
      glow.value = HEAD_GLOW.low;
      return;
    }
    glow.value = withRepeat(withTiming(HEAD_GLOW.high, { duration: HEAD_GLOW.ms, easing: ease('breath') }), -1, true);
    return () => cancelAnimation(glow);
  }, [reduceMotion, phase, paused, glow]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - Math.min(1, Math.max(0, progress.value))),
    // A round cap would leave a dot at zero.
    strokeOpacity: progress.value > 0.002 ? 1 : 0,
  }));
  const layerStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const focusStyle = useAnimatedStyle(() => ({ opacity: focusOn.value }));
  const breakStyle = useAnimatedStyle(() => ({ opacity: 1 - focusOn.value }));
  const headStyle = useAnimatedStyle(() => ({
    opacity: focusOn.value * (progress.value > 0.002 ? 1 : 0),
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const perchSize = theme.layout.companion.size[size >= theme.layout.timer.ring.wide ? 'tablet' : 'compact'];
  // Lumi stands on the ring: its feet overlap the stroke.
  const lift = perchSize - stroke;
  const arc = (color: string, style: object) => (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size}>
        <AnimatedPath
          d={ring}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={arcProps}
        />
      </Svg>
    </Animated.View>
  );

  return (
    <View style={{ width: size, height: size + lift, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: lift, width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Path d={ticks.min} stroke={theme.colors.optik} strokeWidth={TICK_WIDTH.minor} strokeLinecap="round" />
          <Path d={ticks.maj} stroke={theme.colors.optik} strokeWidth={TICK_WIDTH.major} strokeLinecap="round" />
        </Svg>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, layerStyle]}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={c} cy={c} r={r} stroke={theme.colors.optikSoft} strokeWidth={stroke} fill="none" />
          </Svg>
          {arc(theme.colors.mark, focusStyle)}
          {arc(theme.colors.successStrong, breakStyle)}
          {/* The head: a full-size layer turned around its center, the dot at its top. */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, headStyle]}>
            <View style={{ position: 'absolute', left: c - headDot / 2, top: stroke / 2 - headDot / 2, width: headDot, height: headDot }}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: headDot, backgroundColor: theme.colors.accent, transform: [{ scale: HEAD_GLOW.scale }] },
                  haloStyle,
                ]}
              />
              <View style={[StyleSheet.absoluteFill, { borderRadius: headDot / 2, backgroundColor: theme.colors.accent, borderWidth: theme.layout.borderWidth, borderColor: theme.colors.surface }]} />
            </View>
          </Animated.View>
        </Animated.View>
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          {children}
        </View>
      </View>
      <CompanionPerch id="timer-ring" size={perchSize} fallbackMood={mood} />
    </View>
  );
}
