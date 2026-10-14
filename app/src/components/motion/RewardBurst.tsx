import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { badgeInfo } from '../../data/badges';
import { haptics } from '../../lib/haptics';
import { useCompanionStore } from '../../store/companionStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { BadgeSeal } from '../BadgeSeal';
import { Icon } from '../Icon';
import { Mascot } from '../mascot/Mascot';
import { ease, spring } from './presets';

export type RewardKind = { kind: 'badge'; badgeId: string } | { kind: 'streak'; days: number } | { kind: 'level'; level: number };

// The seal's inner circle on its 100-unit grid (BadgeSeal); the sheen stays inside it.
const SEAL_INNER = 0.445;

const RAYS = 12;
const EMBERS = 10;

function Ray({ index, spin, length, color }: { index: number; spin: SharedValue<number>; length: number; color: string }) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(index / RAYS) * 360 + spin.value * theme.motion.reward.raySpinDeg}deg` }, { translateY: -length * 0.9 }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: theme.spacing.xs, height: length * 0.5, borderRadius: theme.radius.pill, backgroundColor: color, opacity: theme.opacity.rewardRay },
        style,
      ]}
    />
  );
}

/** A spark rising from the flame and fading. */
function Ember({ index, progress, color, height }: { index: number; progress: SharedValue<number>; color: string; height: number }) {
  const { confetti } = useTheme().layout;
  const offset = ((index * 37) % 11) / 10 - 0.5;
  const delay = (index % 5) / 5;
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - delay * 0.5) / 0.5));
    return {
      opacity: t <= 0 ? 0 : 1 - t,
      transform: [{ translateX: offset * height * 0.6 + Math.sin(t * 6 + index) * 6 }, { translateY: -t * height }],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', width: confetti.dot, height: confetti.dot, borderRadius: confetti.dot / 2, backgroundColor: color }, style]}
    />
  );
}

/** One soft band of foil light crossing the hero once, clipped to its disc. */
function FoilSheen({ size, inset, progress, color }: { size: number; inset: number; progress: SharedValue<number>; color: string }) {
  const theme = useTheme();
  const band = size * theme.layout.reward.foilBand;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -size + progress.value * size * 2 }, { rotate: `${theme.layout.reward.foilDeg}deg` }],
  }));
  const d = size - inset * 2;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: inset, top: inset, width: d, height: d, borderRadius: d / 2, overflow: 'hidden' }}
    >
      <Animated.View style={[{ position: 'absolute', left: (d - band) / 2, top: -size / 2, width: band, height: d + size }, style]}>
        <Svg width={band} height={d + size}>
          <Defs>
            <LinearGradient id="foil" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity={0} />
              <Stop offset="0.5" stopColor={color} stopOpacity={theme.opacity.foil.reward} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={band} height={d + size} fill="url(#foil)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

interface Props {
  reward: RewardKind;
  onDone: () => void;
  /**
   * Called once it is settled whether the companion flies in for this moment (always false
   * for a badge or a streak), so the host can mark the companion as celebrating only after
   * staging was asked (a celebrating, unstaged companion hides and can no longer be staged).
   */
  onStage?: (staged: boolean) => void;
}

/**
 * Full-screen, non-interactive moment for a new level, a new badge or a longer streak, in
 * the reward's own color: soft tier-colored rays, the hero stamped down (scale 1.3 → 1,
 * −8° → 0°, a rigid tap, then success) and a single soft foil sheen across it. For a level,
 * the companion is staged to fly in (`stage()`); when it can't come, Lumi is drawn here.
 * Reduce Motion: everything fades, nothing moves.
 */
export function RewardBurst({ reward, onDone, onStage }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { duration } = theme.motion;
  const size = theme.layout.resultBadge * theme.layout.reward.heroScale;
  const mascotSize = theme.layout.mascot.note;

  const pop = useSharedValue(0);
  const stamp = useSharedValue(0);
  const sheen = useSharedValue(0);
  const spin = useSharedValue(0);
  const rise = useSharedValue(0);
  const fade = useSharedValue(1);
  const total = duration.celebrate * 1.6;
  const stamps = reward.kind !== 'streak';

  // Level-ups ask the companion to fly in; null until the slot is measured and asked.
  const [staged, setStaged] = useState<boolean | null>(reward.kind === 'level' ? null : false);
  const slot = useRef<View>(null);
  const askedStage = useRef(false);
  // Settled once: a late measurement after the fallback must not swap our Lumi out.
  const settled = useRef(reward.kind !== 'level');
  const settle = (next: boolean) => {
    if (settled.current) return;
    settled.current = true;
    setStaged(next);
  };
  const askStage = () => {
    if (askedStage.current || settled.current) return;
    askedStage.current = true;
    const node = slot.current;
    if (!node) {
      settle(false);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      if (settled.current) return;
      settle(w > 0 ? useCompanionStore.getState().stage({ x: x + w / 2, y: y + h / 2 }) : false);
    });
  };
  useLayoutEffect(() => {
    // Measurement can fail silently (web, unmounted parents): fall back to our own Lumi.
    const t = setTimeout(() => settle(false), duration.base);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration.base]);
  useEffect(() => {
    if (staged !== null) onStage?.(staged);
    // Reported once per settled value; the host's callback may change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged]);
  useEffect(
    () => () => {
      if (askedStage.current) useCompanionStore.getState().stage(null);
    },
    [],
  );

  useEffect(() => {
    const finish = () => onDone();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const feel = () => {
      if (stamps) {
        haptics.rigid();
        timers.push(setTimeout(haptics.success, theme.motion.reward.successAfter));
      } else {
        haptics.success();
      }
    };
    if (reduceMotion) {
      const fadeOnly = { duration: duration.base, reduceMotion: ReduceMotion.Never };
      pop.value = withTiming(1, fadeOnly);
      stamp.value = withTiming(1, fadeOnly);
      timers.push(setTimeout(feel, duration.base));
      fade.value = withDelay(total - duration.base, withTiming(0, fadeOnly, (ok) => ok && runOnJS(finish)()), ReduceMotion.Never);
      return () => timers.forEach(clearTimeout);
    }
    pop.value = withTiming(1, { duration: duration.slow, easing: ease('enter') });
    // The stamp comes down and settles; the tap lands as it touches the paper.
    stamp.value = withSpring(1, spring('settle'));
    timers.push(setTimeout(feel, duration.fast));
    sheen.value = withDelay(duration.slow, withTiming(1, { duration: theme.motion.progress.shine, easing: ease('standard') }));
    spin.value = withTiming(1, { duration: total, easing: Easing.linear });
    rise.value = withTiming(1, { duration: total * 0.8, easing: ease('enter') });
    fade.value = withDelay(total - duration.slow, withTiming(0, { duration: duration.slow, easing: ease('exit') }, (ok) => ok && runOnJS(finish)()));
    return () => timers.forEach(clearTimeout);
    // Once per mount; the provider remounts the burst for every reward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: pop.value }));
  const heroStyle = useAnimatedStyle(() => {
    const s = stamp.value;
    return {
      opacity: Math.min(1, s * 2.5),
      transform: reduceMotion ? [] : [{ scale: theme.motion.reward.stamp.fromScale + (1 - theme.motion.reward.stamp.fromScale) * s }, { rotate: `${theme.motion.reward.stamp.fromDeg * (1 - s)}deg` }],
    };
  });
  const textStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - pop.value) * theme.spacing.lg }],
  }));

  const rays = useMemo(() => Array.from({ length: RAYS }, (_, i) => i), []);
  const embers = useMemo(() => Array.from({ length: EMBERS }, (_, i) => i), []);

  let hero: ReactNode;
  let eyebrow: string;
  let title: string;
  let detail: string;
  let tierColor: string;
  let sheenInset = 0;
  if (reward.kind === 'badge') {
    const info = badgeInfo(reward.badgeId);
    hero = <BadgeSeal icon={info.icon} tier={info.tier} size={size} />;
    eyebrow = 'Yeni rozet';
    title = info.title;
    detail = info.description;
    tierColor = theme.colors.badge[info.tier];
    sheenInset = size * (0.5 - SEAL_INNER);
  } else if (reward.kind === 'level') {
    hero = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.accent,
          borderWidth: theme.layout.shutterBorder,
          borderColor: theme.colors.highlight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="hero" tint={theme.colors.highlightInk} tabular>
          {reward.level}
        </AppText>
      </View>
    );
    eyebrow = 'Seviye atladın';
    title = `Seviye ${reward.level}`;
    detail = 'Her gün biraz daha net. Böyle devam.';
    tierColor = theme.colors.accent;
  } else {
    hero = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.streakSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!reduceMotion
          ? embers.map((i) => <Ember key={i} index={i} progress={rise} color={theme.colors.confetti[i % theme.colors.confetti.length]!} height={size} />)
          : null}
        <Icon name="flame" size={size * 0.55} color={theme.colors.streak} filled />
      </View>
    );
    eyebrow = 'Seri';
    title = `${reward.days} gün`;
    detail = reward.days === 1 ? 'Yeni bir seri başladı. Yarın da gel.' : 'Üst üste çalıştın. Serini bozma.';
    tierColor = theme.colors.streak;
  }

  const mood = reward.kind === 'badge' ? 'love' : reward.kind === 'level' ? 'proud' : 'cheer';

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={`${eyebrow}. ${title}. ${detail}`}
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, containerStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.celebrationScrim }, scrimStyle]} />
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {!reduceMotion ? rays.map((i) => <Ray key={i} index={i} spin={spin} length={size} color={tierColor} />) : null}
        <Animated.View style={heroStyle}>
          {hero}
          {stamps && !reduceMotion ? <FoilSheen size={size} inset={sheenInset} progress={sheen} color={theme.colors.badge.foil} /> : null}
        </Animated.View>
      </View>
      <Animated.View
        style={[
          { alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl, maxWidth: theme.layout.readableWidth / 2, paddingHorizontal: theme.spacing.xl },
          textStyle,
        ]}
      >
        <View ref={slot} collapsable={false} onLayout={askStage} style={{ width: mascotSize, height: mascotSize }}>
          {staged === false ? <Mascot mood={mood} size={mascotSize} /> : null}
        </View>
        <AppText variant="label" weight="semibold" color="primaryText">
          {eyebrow}
        </AppText>
        <AppText variant="title" align="center">
          {title}
        </AppText>
        <AppText color="textMuted" align="center">
          {detail}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}
