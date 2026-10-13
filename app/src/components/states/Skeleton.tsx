import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { elevated, useTheme } from '../../theme';

const PulseContext = createContext<SharedValue<number> | null>(null);

/**
 * Loading placeholders in the shape of the content to come. Every block under one
 * `Skeleton` breathes on the same clock, so a page of them reads as one quiet surface.
 */
export function Skeleton({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.5;
      return;
    }
    const half = theme.motion.duration.celebrate / 2;
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) })),
      -1,
    );
  }, [pulse, reduceMotion, theme.motion.duration.celebrate]);
  return (
    <PulseContext.Provider value={pulse}>
      <View accessibilityRole="progressbar" accessibilityLabel="Yükleniyor" style={[{ gap: theme.spacing.lg }, style]}>
        {children}
      </View>
    </PulseContext.Provider>
  );
}

/** One grey block: a line of text, a picture, a button. Needs a `Skeleton` above it. */
export function Bone({ width = '100%', height, radius, style }: { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const pulse = useContext(PulseContext);
  const { low, high } = theme.opacity.skeleton;
  const animated = useAnimatedStyle(() => ({ opacity: pulse ? low + (high - low) * pulse.value : high }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius ?? theme.radius.sm, borderCurve: 'continuous', backgroundColor: theme.colors.surfaceAlt }, animated, style]}
    />
  );
}

/** Lines of text; the last one is shorter, like a paragraph's end. */
export function BoneText({ lines = 3, size = 'md' }: { lines?: number; size?: 'md' | 'lg' }) {
  const theme = useTheme();
  const height = size === 'lg' ? theme.fontSize.xl : theme.fontSize.md;
  const widths: DimensionValue[] = ['92%', '100%', '84%', '96%', '70%'];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} height={height} width={i === lines - 1 && lines > 1 ? '55%' : widths[i % widths.length]} />
      ))}
    </View>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ ...elevated(theme), padding: theme.layout.cardPadding, gap: theme.spacing.md }}>{children}</View>;
}

/** A card with a few lines of text (and an optional tall block for a chart or picture). */
export function SkeletonCard({ lines = 3, block }: { lines?: number; block?: number }) {
  return (
    <CardShell>
      {block ? <Bone height={block} /> : null}
      <BoneText lines={lines} />
    </CardShell>
  );
}

/** List rows: a square thumbnail and two lines each. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const theme = useTheme();
  const thumb = theme.layout.minTouch + theme.spacing.md;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <CardShell key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Bone width={thumb} height={thumb} radius={theme.radius.sm} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Bone height={theme.fontSize.md} width="60%" />
              <Bone height={theme.fontSize.sm} width="85%" />
            </View>
          </View>
        </CardShell>
      ))}
    </>
  );
}

/** A question page: badges, the photo, its text and five choice rows. */
export function SkeletonQuestion() {
  const theme = useTheme();
  return (
    <>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Bone width={48} height={theme.layout.minTouch - theme.spacing.lg} radius={theme.radius.pill} />
        <Bone width={72} height={theme.layout.minTouch - theme.spacing.lg} radius={theme.radius.pill} />
      </View>
      <Bone height={theme.fontSize.xl} width="70%" />
      <CardShell>
        <Bone height={theme.layout.questionImageCap.compact} radius={theme.radius.md} />
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} height={theme.layout.minTouch + theme.spacing.xs} radius={theme.radius.md} />
        ))}
      </CardShell>
    </>
  );
}
