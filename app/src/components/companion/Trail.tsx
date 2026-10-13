import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { LIGHT } from '../mascot/parts';
import { arcPoint } from './flight';

/** Lumi's drawing grid (parts.tsx viewBox); the dots sit on its antenna light (LIGHT). */
const GRID = 200;
// TOKEN-PENDING: layout.companion.trailStep = 0.04 (progress between trail dots)
const TRAIL_STEP = 0.04;
// TOKEN-PENDING: opacity.trailDot = 0.8 (the nearest dot; later ones fade by k/5)
const TRAIL_OPACITY = 0.8;
// TOKEN-PENDING: layout.companion.trailHalo = 2 (halo radius as a multiple of the core)
const HALO_SCALE = 2;

export interface FlightValues {
  p: SharedValue<number>;
  fx: SharedValue<number>;
  fy: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  lift: SharedValue<number>;
  /** 1 while the trail shows; fades to 0 after touch-down. */
  trail: SharedValue<number>;
  /** 1 = mirrored (facing left). */
  flip: SharedValue<number>;
}

/**
 * Five fading antenna-light dots behind Lumi, sampled on the same arc a little earlier
 * (p − k·0.04): no buffer, five Views driven by the flight's own values (spec 6.4.5).
 */
export function Trail({ f, size }: { f: FlightValues; size: number }) {
  const theme = useTheme();
  const n = theme.layout.companion.trailDots;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, i) => (
        <TrailDot key={i} k={i + 1} n={n} f={f} size={size} />
      ))}
    </View>
  );
}

function TrailDot({ k, n, f, size }: { k: number; n: number; f: FlightValues; size: number }) {
  const theme = useTheme();
  const { max, min } = theme.layout.companion.trailDot;
  const r = max - ((max - min) * (k - 1)) / Math.max(1, n - 1);
  const halo = r * HALO_SCALE;
  const lx = (LIGHT.x / GRID) * size;
  const ly = (LIGHT.y / GRID) * size;
  const style = useAnimatedStyle(() => {
    const q = f.p.value - k * TRAIL_STEP;
    const pt = arcPoint(q, f.fx.value, f.fy.value, f.tx.value, f.ty.value, f.lift.value);
    const ax = f.flip.value ? size - lx : lx;
    const fade = q <= 0 ? 0 : (1 - (k - 1) / n) * TRAIL_OPACITY;
    return {
      opacity: fade * f.trail.value,
      transform: [{ translateX: pt.x + ax - halo }, { translateY: pt.y + ly - halo }],
    };
  });
  return (
    <Animated.View style={[styles.dot, { width: halo * 2, height: halo * 2, borderRadius: halo, backgroundColor: theme.colors.mascot.glowSoft }, style]}>
      <View style={{ width: r * 2, height: r * 2, borderRadius: r, backgroundColor: theme.colors.mascot.glow }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
