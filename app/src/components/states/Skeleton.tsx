import { createContext, useContext, useEffect, useId, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Card } from '../Card';
import { ease } from '../motion/presets';


interface SkeletonClock {
  pulse: SharedValue<number>;
  sweep: SharedValue<number>;
  /** How far the band travels: the skeleton's width, so every bone sweeps in step. */
  travel: SharedValue<number>;
  /** The skeleton's own view: each bone measures its offset from it, so one band crosses them all. */
  host: RefObject<View | null>;
  shimmer: boolean;
}

const ClockContext = createContext<SkeletonClock | null>(null);

/**
 * Loading placeholders in the shape of the content to come. Every block under one
 * `Skeleton` breathes on the same clock, so a page of them reads as one quiet surface.
 * `shimmer` swaps the breathing for a soft light band that sweeps across every bone.
 * Under Reduce Motion the bones hold still.
 */
export function Skeleton({ children, style, shimmer = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; shimmer?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(shimmer ? 1 : 0);
  const sweep = useSharedValue(0);
  const travel = useSharedValue(0);
  const host = useRef<View>(null);
  const { celebrate, slow } = theme.motion.duration;
  const live = shimmer && !reduceMotion;
  // A stable value, so a re-render of the page doesn't re-render every bone.
  const clock = useMemo<SkeletonClock>(() => ({ pulse, sweep, travel, host, shimmer: live }), [pulse, sweep, travel, live]);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = theme.opacity.skeleton.still;
      sweep.value = 0;
      return;
    }
    if (shimmer) {
      pulse.value = 1;
      sweep.value = 0;
      // A pause with the band parked off the left edge, then one slow pass.
      sweep.value = withRepeat(withDelay(slow, withTiming(1, { duration: celebrate, easing: ease('breath') })), -1, false);
    } else {
      const half = celebrate / 2;
      pulse.value = withRepeat(withSequence(withTiming(1, { duration: half, easing: ease('breath') }), withTiming(0, { duration: half, easing: ease('breath') })), -1);
    }
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(sweep);
    };
  }, [pulse, sweep, reduceMotion, shimmer, celebrate, slow]);

  const onLayout = (e: LayoutChangeEvent) => {
    travel.value = e.nativeEvent.layout.width;
  };

  return (
    <ClockContext.Provider value={clock}>
      <View
        ref={host}
        accessibilityRole="progressbar"
        accessibilityLabel="Yükleniyor"
        onLayout={live ? onLayout : undefined}
        style={[{ gap: theme.spacing.lg }, style]}
      >
        {children}
      </View>
    </ClockContext.Provider>
  );
}

/**
 * The light band of the shimmer: a horizontal gradient that fades in and out at its edges.
 * It travels in the skeleton's coordinates (the bone's offset is measured once laid out),
 * so a row's thumbnail and its lines catch the same band, not one band each.
 */
function ShimmerBand({ height, clock }: { height: number; clock: SkeletonClock }) {
  const theme = useTheme();
  const gradientId = `bone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const frame = useRef<View>(null);
  const offset = useSharedValue(0);
  const { sweep, travel, host } = clock;
  const band = theme.layout.bone.shimmerBand;
  // Lighter than the bone in both schemes: paper white in light, the hairline tone in dark.
  const glow = theme.scheme === 'dark' ? theme.colors.border : theme.colors.surface;
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: -band - offset.value + (travel.value + band) * sweep.value }] }));

  const onLayout = () => {
    const root = host.current;
    const self = frame.current;
    if (!root || !self) return;
    self.measureLayout(root, (x) => {
      offset.value = x;
    });
  };

  return (
    <View ref={frame} onLayout={onLayout} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: band, height }, moving]}>
        <Svg width={band} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={glow} stopOpacity={0} />
              <Stop offset="0.5" stopColor={glow} stopOpacity={theme.opacity.skeleton.shimmer} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={band} height={height} fill={`url(#${gradientId})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** One grey block: a line of text, a picture, a button. Needs a `Skeleton` above it. */
export function Bone({ width = '100%', height, radius, style }: { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const clock = useContext(ClockContext);
  const pulse = clock?.pulse;
  const { low, high } = theme.opacity.skeleton;
  const animated = useAnimatedStyle(() => ({ opacity: pulse ? low + (high - low) * pulse.value : high }));
  const shimmer = !!clock?.shimmer;
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          borderCurve: 'continuous',
          backgroundColor: theme.colors.surfaceAlt,
          overflow: shimmer ? 'hidden' : undefined,
        },
        animated,
        style,
      ]}
    >
      {shimmer && clock ? <ShimmerBand height={height} clock={clock} /> : null}
    </Animated.View>
  );
}

/** Lines of text; the last one is shorter, like a paragraph's end. */
export function BoneText({ lines = 3, size = 'md' }: { lines?: number; size?: 'md' | 'lg' }) {
  const theme = useTheme();
  const height = size === 'lg' ? theme.fontSize.xl : theme.fontSize.md;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} height={height} width={i === lines - 1 && lines > 1 ? theme.layout.bone.last : theme.layout.bone.text[i % theme.layout.bone.text.length]} />
      ))}
    </View>
  );
}

/** A card with a few lines of text (and an optional tall block for a chart or picture). */
export function SkeletonCard({ lines = 3, block }: { lines?: number; block?: number }) {
  return (
    <Card variant="sheet">
      {block ? <Bone height={block} /> : null}
      <BoneText lines={lines} />
    </Card>
  );
}

/** List rows: a square thumbnail and two lines each. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const theme = useTheme();
  const thumb = theme.layout.minTouch + theme.spacing.md;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="sheet">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Bone width={thumb} height={thumb} radius={theme.radius.sm} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Bone height={theme.fontSize.md} width={theme.layout.bone.title} />
              <Bone height={theme.fontSize.sm} width={theme.layout.bone.detail} />
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}

/** A question page: badges, the photo, its text and five choice rows. */
export function SkeletonQuestion() {
  const theme = useTheme();
  const badge = theme.layout.minTouch - theme.spacing.lg;
  return (
    <>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {theme.layout.bone.badges.map((w) => (
          <Bone key={w} width={w} height={badge} radius={theme.radius.pill} />
        ))}
      </View>
      <Bone height={theme.fontSize.xl} width={theme.layout.bone.heading} />
      <Card variant="sheet">
        <Bone height={theme.layout.questionImageCap.compact} radius={theme.radius.md} />
        {Array.from({ length: theme.layout.bone.choices }, (_, i) => (
          <Bone key={i} height={theme.layout.minTouch + theme.spacing.xs} radius={theme.radius.md} />
        ))}
      </Card>
    </>
  );
}
