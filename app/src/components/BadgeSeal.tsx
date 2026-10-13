import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BadgeTier } from '../data/badges';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { ease } from './motion/presets';

// TOKEN-PENDING: motion.badge.foilMs = 700 (the one-time foil sheen over a newly seen badge, spec 7.5)
const FOIL_MS = 700;
// TOKEN-PENDING: opacity.foil = 0.55 (the sheen band; soft, no flash, spec 2.0 rule 4)
const FOIL_OPACITY = 0.55;
// TOKEN-PENDING: layout.badge.foil = { band: 0.34, tiltDeg: 20 } (band width as a share of the seal, its slant)
const FOIL = { band: 0.34, tiltDeg: 20 };
// TOKEN-PENDING: layout.badge.arc = { radius: 57, stroke: 4, inset: 12 } (the locked seal's progress arc, 100-unit grid)
const ARC = { radius: 57, stroke: 4, inset: 12 };
// TOKEN-PENDING: layout.badge.glyphShare = 0.38 (the glyph as a share of the seal)
const GLYPH_SHARE = 0.38;

const SCALLOPS = 18;

/** Outline of a stamp-like seal: a circle with soft scallops, on a 100-unit grid. */
function sealPath(): string {
  const c = 50;
  const outer = 49;
  const inner = 44.5;
  const pts: string[] = [];
  for (let i = 0; i < SCALLOPS; i++) {
    const a0 = (i / SCALLOPS) * Math.PI * 2;
    const a1 = ((i + 0.5) / SCALLOPS) * Math.PI * 2;
    const a2 = ((i + 1) / SCALLOPS) * Math.PI * 2;
    const p = (a: number, r: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`;
    pts.push(i === 0 ? `M ${p(a0, inner)}` : '');
    pts.push(`Q ${p(a1, outer + 3)} ${p(a2, inner)}`);
  }
  return `${pts.join(' ')} Z`;
}
const SEAL = sealPath();

/** An arc from 12 o'clock, clockwise over `fraction` of the circle (no transform needed). */
function arcPath(fraction: number, r: number): string {
  const f = Math.min(0.9999, Math.max(0, fraction));
  const a = f * Math.PI * 2;
  const x = 50 + Math.sin(a) * r;
  const y = 50 - Math.cos(a) * r;
  return `M 50 ${50 - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

interface Props {
  icon: IconName;
  tier: BadgeTier;
  size?: number;
  /** Not earned yet: muted, with a lock. */
  locked?: boolean;
  /** Locked only: how far along the goal is (0..1), drawn as an arc around the seal. */
  progress?: number;
  /** Plays the foil sheen once (newly seen earned badge). */
  sheen?: boolean;
  /** Delay before the sheen (ms), to stagger several seals. */
  sheenDelay?: number;
}

/** A badge drawn as a scalloped seal with an inner ring and its glyph. */
export function BadgeSeal({ icon, tier, size, locked = false, progress, sheen = false, sheenDelay = 0 }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const s = size ?? theme.layout.minTouch + theme.spacing.xl;
  const fill = locked ? theme.colors.badge.locked : theme.colors.badge[tier];
  const ink = locked ? theme.colors.badge.lockedInk : theme.colors.badge.ink;
  const withArc = locked && progress !== undefined;
  // Room for the arc: the seal draws smaller inside the same box.
  const viewBox = withArc ? `${-ARC.inset} ${-ARC.inset} ${100 + ARC.inset * 2} ${100 + ARC.inset * 2}` : '0 0 100 100';
  const sealSize = withArc ? (s * 100) / (100 + ARC.inset * 2) : s;

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!sheen || locked || reduceMotion) return;
    sweep.value = 0;
    sweep.value = withDelay(sheenDelay, withTiming(1, { duration: FOIL_MS, easing: ease('standard') }));
  }, [sheen, locked, reduceMotion, sheenDelay, sweep]);
  const band = s * FOIL.band;
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? FOIL_OPACITY : 0,
    transform: [{ translateX: -band * 2 + (s + band * 2) * sweep.value }],
  }));

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox={viewBox} style={StyleSheet.absoluteFill}>
        {withArc ? (
          <>
            <Circle cx={50} cy={50} r={ARC.radius} fill="none" stroke={theme.colors.optikSoft} strokeWidth={ARC.stroke} />
            {progress > 0 ? (
              <Path d={arcPath(progress, ARC.radius)} fill="none" stroke={theme.colors.badge[tier]} strokeWidth={ARC.stroke} strokeLinecap="round" />
            ) : null}
          </>
        ) : null}
        <Path d={SEAL} fill={fill} />
        <Circle cx={50} cy={50} r={36} fill="none" stroke={ink} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="2 3" />
      </Svg>
      {sheen && !locked ? (
        <View pointerEvents="none" style={{ position: 'absolute', width: sealSize, height: sealSize, borderRadius: sealSize / 2, overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', top: -s / 2, bottom: -s / 2, left: 0, width: band }, sheenStyle]}>
            <View style={{ flex: 1, backgroundColor: theme.colors.badge.foil, transform: [{ rotate: `${FOIL.tiltDeg}deg` }] }} />
          </Animated.View>
        </View>
      ) : null}
      {/* In its own view so it stacks above the absolutely placed seal on web too. */}
      <View>
        <Icon name={locked ? 'lock' : icon} size={sealSize * GLYPH_SHARE} color={ink} duotone={!locked} />
      </View>
    </View>
  );
}
