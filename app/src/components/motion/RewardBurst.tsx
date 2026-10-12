import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { badgeInfo } from '../../data/badges';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { BadgeSeal } from '../BadgeSeal';
import { Icon } from '../Icon';

export type RewardKind = { kind: 'badge'; badgeId: string } | { kind: 'streak'; days: number };

const RAYS = 12;
const EMBERS = 10;

function Ray({ index, spin, length, color }: { index: number; spin: SharedValue<number>; length: number; color: string }) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(index / RAYS) * 360 + spin.value * 30}deg` }, { translateY: -length * 0.9 }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: theme.spacing.xs, height: length * 0.5, borderRadius: theme.radius.pill, backgroundColor: color, opacity: 0.35 },
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

interface Props {
  reward: RewardKind;
  onDone: () => void;
}

/** Full-screen, non-interactive moment for a new badge or a longer streak. */
export function RewardBurst({ reward, onDone }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { duration, springBouncy } = theme.motion;
  const size = theme.layout.resultBadge * 1.4;

  const pop = useSharedValue(0);
  const spin = useSharedValue(0);
  const rise = useSharedValue(0);
  const fade = useSharedValue(1);
  const total = duration.celebrate * 1.6;

  useEffect(() => {
    const finish = () => onDone();
    if (reduceMotion) {
      const fadeOnly = { duration: duration.base, reduceMotion: ReduceMotion.Never };
      pop.value = withTiming(1, fadeOnly);
      fade.value = withDelay(total - duration.base, withTiming(0, fadeOnly, (ok) => ok && runOnJS(finish)()), ReduceMotion.Never);
      return;
    }
    pop.value = withSpring(1, springBouncy);
    spin.value = withRepeat(withTiming(1, { duration: total, easing: Easing.linear }), 1);
    rise.value = withTiming(1, { duration: total * 0.8, easing: Easing.out(Easing.quad) });
    fade.value = withDelay(total - duration.slow, withTiming(0, { duration: duration.slow }, (ok) => ok && runOnJS(finish)()));
    // Once per mount; the provider remounts the burst for every reward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.5) }));
  const minScale = reduceMotion ? 1 : 0.3;
  const heroStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: minScale + (1 - minScale) * pop.value }, { rotate: `${(1 - pop.value) * -12}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: (1 - pop.value) * theme.spacing.lg }],
  }));

  const rays = useMemo(() => Array.from({ length: RAYS }, (_, i) => i), []);
  const embers = useMemo(() => Array.from({ length: EMBERS }, (_, i) => i), []);

  let hero: React.ReactNode;
  let eyebrow: string;
  let title: string;
  let detail: string;
  let rayColor: string;
  if (reward.kind === 'badge') {
    const info = badgeInfo(reward.badgeId);
    hero = <BadgeSeal icon={info.icon} tier={info.tier} size={size} />;
    eyebrow = 'YENİ ROZET';
    title = info.title;
    detail = info.description;
    rayColor = theme.colors.badge[info.tier];
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
    eyebrow = 'SERİ';
    title = `${reward.days} gün`;
    detail = reward.days === 1 ? 'Yeni bir seri başladı. Yarın da gel.' : 'Üst üste çalıştın. Serini bozma.';
    rayColor = theme.colors.streak;
  }

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.celebrationScrim }, scrimStyle]} />
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {!reduceMotion ? rays.map((i) => <Ray key={i} index={i} spin={spin} length={size} color={rayColor} />) : null}
        <Animated.View style={heroStyle}>{hero}</Animated.View>
      </View>
      <Animated.View style={[{ alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl, maxWidth: theme.layout.readableWidth / 2 }, textStyle]}>
        <AppText variant="caption" weight="semibold" color="primaryText" style={{ letterSpacing: 1.2 }}>
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
