import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';
import { haptics } from '../../lib/haptics';
import { usePrefsStore, type Outfit } from '../../store/prefsStore';
import { motion, useTheme, type MascotColors } from '../../theme';
import { ease } from '../motion/presets';
import {
  Arm,
  ARM_LEN,
  BLINKING_EYES,
  Body,
  Brows,
  Cup,
  EffectArt,
  EYE_Y,
  Eyes,
  Feet,
  GROUND,
  handAt,
  LIGHT,
  Mouth,
  MOUTH,
  PIVOT,
  Shadow,
  Tip,
  TIP_BASE,
  TipLight,
  Worn,
  type Effect,
} from './parts';
import { FACE_ITEMS, HEAD_ITEMS, POSES, type ArmMotion, type BodyMotion, type Held, type MascotMood, type Pose } from './poses';

export type { Held, MascotMood } from './poses';

/**
 * The loops' shapes: amplitudes (grid units, degrees, scale) and timings (ms) per body and arm
 * motion, fidget and effect. `motion.mascot` holds the shared ones (pose spring, hop, blink,
 * flap, reaction, fidget gap, entrance, effect phase).
 */
// TOKEN-PENDING: motion.mascot.loops = (the LOOPS table below)
const LOOPS = {
  hop: { height: -10, pause: 520 },
  jump: { height: -22, pause: 220 },
  hopLand: 260,
  stretch: { sy: 1.06, sx: 0.96 },
  squash: { sy: 0.9, sx: 1.08, ms: 110, settle: 150 },
  droop: { sy: 0.985, syMs: 2200, rot: 2, rotMs: 2400 },
  sway: { rot: 4, sy: 1.02, ms: 900 },
  nod: { rot: 2.5, y: 1.5, ms: 480 },
  wobble: { rot: 6, ms: 700 },
  bob: { y: -5, sy: 1.02, ms: 650 },
  breathe: { sy: 1.045, sx: 0.975, y: -3, ms: 1300 },
  wave: { from: 14, to: -16, ms: 280 },
  wiggle: { from: -10, to: 12, ms: 220 },
  shake: { deg: 14, ms: 140 },
  gesture: { deg: 20, ms: 760 },
  tap: { deg: -6, ms: 160, rest: 700 },
  scribble: { deg: 6, ms: 110 },
  sip: { delay: 1800, deg: 14, ms: 420, hold: 700 },
  pop: { deg: 16, ms: 90, rest: 1100 },
  blink: { closed: 0.1, close: 70, open: 100, every: 3400 },
  blink2: { close: 60, open: 80, reopen: 90 },
  tipSway: { deg: 5, ms: 1500 },
  glow: { rest: 1.12, restMs: 1500, pulse: 1.35, pulseMs: 420, dimMs: 500 },
  talk: { from: 0.35, ms: 130 },
  fxMs: 1500,
  popSpring: { damping: 7, stiffness: 160 },
  enterSpring: { damping: 9, stiffness: 150, mass: 0.7 },
  bump: { up: 1.08, upMs: 110, down: 0.95, downMs: 120, spring: { damping: 8, stiffness: 200 } },
  idleArm: { deg: 5, ms: 1300 },
  fidgetSpring: { damping: 12, stiffness: 160 },
  look: { x: 5, back: -3, y: -1, hold: 700, settle: 500, yHold: 1200 },
  lookUp: { x: 4, y: -4, hold: 900 },
  fidgetHop: { y: -14, up: 200, down: 190, stretch: 1.05, squash: 0.9, squashMs: 90 },
  flick: { deg: -16, ms: 120, spring: { damping: 5, stiffness: 180 } },
  tilt: { deg: 7, hold: 900 },
  shiver: { deg: 5, ms: [90, 120, 120] },
  hello: { up: -122, low: -104, high: -136, ms: 170, times: 3, settle: 150, face: -2, faceHold: 1300 },
  /** How far the eyes shift toward `lookAt` (grid units). */
  lookAtShift: 4,
  /** Effect loops: travel (grid units), turn (degrees), scale and opacity ranges. */
  fx: {
    tear: { fall: 22 },
    sweat: { fall: 8, fade: 0.7 },
    zzz: { x: 8, rise: 14, from: 0.8, grow: 0.35 },
    hearts: { rise: 18, from: 0.7, grow: 0.4 },
    sparkles: { dim: 0.4, from: 0.5, grow: 0.7, turn: 90 },
    question: { bob: 3, turn: 8 },
    exclaim: { pulse: 0.06, bob: 1.5 },
    confetti: { fall: 26, fade: 0.8, turn: 10 },
    flame: { from: 0.9, flicker: 0.12, rate: 6, sway: 0.05 },
    steam: { opacity: 0.9, rise: 8, drift: 1.5 },
  },
} as const;

interface Props {
  mood?: MascotMood;
  size?: number;
  /** No motion (e.g. small avatars in a long list). Reduced motion also keeps it still. */
  still?: boolean;
  /** Reacts to a tap (a little jump and a happy face). On by default from note size up, or with `onPress`. */
  interactive?: boolean;
  /** Called on a tap, after the reaction starts. */
  onPress?: () => void;
  /** The tap reactions, played in turn (default: happy, wink, love, surprised, celebrate). */
  reactions?: MascotMood[];
  /** Which way Lumi faces; `left` mirrors the drawing. */
  facing?: 'left' | 'right';
  /** Eyes biased toward something to the left (-1) or right (1). */
  lookAt?: -1 | 0 | 1;
  /** What Lumi wears; omitted = the student's wardrobe (prefs), null = nothing. A pose's own item wins per slot. */
  outfit?: Outfit | null;
  /** Pops in on first show (default true); false for swaps between the still and the live Lumi. */
  enter?: boolean;
  /** Overrides what the pose holds (null = empty hands). */
  held?: Held | null;
  /** Still Lumi only: the eyes follow the scroll (up/down) instead of the pose's open eyes. */
  gaze?: 'up' | 'down' | null;
  /** Still Lumi only: the eyes are shut for a blink. */
  blink?: boolean;
}

const MASCOT = motion.mascot;

/** What Lumi does when tapped, in turn. */
const TAP_REACTIONS: MascotMood[] = ['happy', 'wink', 'love', 'surprised', 'celebrate'];

/** A pose dressed in the wardrobe (the pose's own items win per slot) and with an override in its hands. */
function dress(pose: Pose, outfit: Outfit | null, held: Held | null | undefined): Pose {
  let out = pose;
  if (held !== undefined && held !== (pose.held ?? null)) out = { ...out, held: held ?? undefined };
  if (!outfit) return out;
  const worn = [...(pose.worn ?? [])];
  if (outfit.head && !worn.some((w) => HEAD_ITEMS.includes(w))) worn.push(outfit.head);
  if (outfit.face && !worn.some((w) => FACE_ITEMS.includes(w))) worn.push(outfit.face);
  return worn.length === (pose.worn ?? []).length ? out : { ...out, worn };
}

/**
 * Lumi, the assistant: a little flat clay flame with a gold light in its swaying tip. Each
 * mood has a pose (eyes, mouth, arms, props) and a loop (breathing, waving, hopping…);
 * switching moods springs the arms over to the new pose. Between those, Lumi fidgets on its
 * own: looks around, blinks twice, hops, flares its tip, waves. Tapping it gets a reaction.
 * Decorative: what it "says" is in text.
 */
export function Mascot({
  mood = 'idle',
  size,
  still = false,
  interactive,
  onPress,
  reactions = TAP_REACTIONS,
  facing = 'right',
  lookAt = 0,
  outfit,
  enter = true,
  held,
  gaze = null,
  blink = false,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const s = size ?? theme.layout.mascot.note;
  const c = theme.colors.mascot;
  const wardrobe = usePrefsStore((st) => st.outfit);
  const wear = outfit === undefined ? wardrobe : outfit;
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const shown = reaction ?? mood;
  const head = wear?.head ?? null;
  const face = wear?.face ?? null;
  const pose = useMemo(() => dress(POSES[shown], head || face ? { head, face } : null, held), [shown, head, face, held]);
  const drawn =
    still || reduceMotion ? (
      <StillMascot pose={pose} size={s} c={c} lookAt={lookAt} gaze={gaze} blink={blink} />
    ) : (
      <LiveMascot mood={shown} pose={pose} size={s} c={c} lookAt={lookAt} enter={enter} />
    );
  // Facing left mirrors the whole drawing (a static transform, so iOS needs no pivot trick).
  const body = facing === 'left' ? <View style={[StyleSheet.absoluteFill, { transform: [{ scaleX: -1 }] }]}>{drawn}</View> : drawn;
  const canTap = interactive ?? (!!onPress || s >= theme.layout.mascot.note);
  if (!canTap) {
    return (
      <View aria-hidden pointerEvents="none" style={{ width: s, height: s }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      aria-hidden
      accessible={false}
      // A small Lumi still gets a full touch target.
      hitSlop={Math.max(0, (theme.layout.system.minTouch - s) / 2)}
      onPress={() => {
        haptics.tap();
        if (reactions.length) {
          setReaction(reactions[taps.current++ % reactions.length]!);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setReaction(null), theme.motion.mascot.reactionMs);
        }
        onPress?.();
      }}
      style={{ width: s, height: s }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {body}
      </View>
    </Pressable>
  );
}

/** The shadow scales around its own centre under the feet. */
const SHADOW_ORIGIN = { x: GROUND.x, y: 190 };

const cupCorner = (angle: number) => {
  const h = handAt('r', angle);
  return { x: h.x - 12, y: h.y - 14 };
};

/** The right hand's prop as Arm draws it. */
const heldRight = (pose: Pose) =>
  pose.held === 'pompoms' ? 'pompom' : pose.held === 'pencil' ? 'pencil' : pose.held === 'marker' ? 'marker' : undefined;

/** The worn items that move with the face (glasses) or stay on the body (the rest). */
const wornOn = (pose: Pose, face: boolean) => (pose.worn ?? []).filter((w) => FACE_ITEMS.includes(w) === face);

/** The pose drawn once, in a single SVG (eyes can follow `lookAt`, the scroll `gaze`, or blink). */
export function StillMascot({
  pose,
  size,
  c,
  lookAt = 0,
  gaze = null,
  blink = false,
}: {
  pose: Pose;
  size: number;
  c: MascotColors;
  lookAt?: -1 | 0 | 1;
  gaze?: 'up' | 'down' | null;
  blink?: boolean;
}) {
  const lift = pose.lift ?? 0;
  const cup = pose.held === 'cup' ? cupCorner(pose.armR) : null;
  // Only open eyes look around or blink; happy, closed or heart eyes keep their shape.
  const open = BLINKING_EYES.includes(pose.eyes);
  const eyes = open && blink ? 'closed' : open && gaze ? gaze : pose.eyes;
  const look = open ? lookAt * LOOPS.lookAtShift : 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Shadow c={c} rx={46 - Math.abs(lift)} />
      <G transform={`translate(0 ${lift}) rotate(${pose.tilt ?? 0} ${GROUND.x} ${GROUND.y})`}>
        <Feet c={c} />
        <Tip c={c} />
        <G opacity={pose.glow ?? 1}>
          <TipLight c={c} />
        </G>
        <Body c={c} blush={pose.blush} />
        <G transform={look ? `translate(${look} 0)` : undefined}>
          <Eyes c={c} kind={eyes} />
        </G>
        {pose.brows ? <Brows c={c} kind={pose.brows} /> : null}
        <Mouth c={c} kind={pose.mouth} />
        {/* Glasses look around with the eyes. */}
        <G transform={look ? `translate(${look} 0)` : undefined}>
          {wornOn(pose, true).map((w) => (
            <Worn key={w} c={c} item={w} />
          ))}
        </G>
        {wornOn(pose, false).map((w) => (
          <Worn key={w} c={c} item={w} />
        ))}
        <Arm c={c} side="l" angle={pose.armL} held={pose.held === 'pompoms' ? 'pompom' : undefined} />
        <Arm c={c} side="r" angle={pose.armR} held={heldRight(pose)} />
        {cup ? <Cup c={c} x={cup.x} y={cup.y} /> : null}
        {(pose.effects ?? []).map((e) =>
          e === 'steam' && cup ? (
            <G key={e} transform={`translate(${cup.x} ${cup.y})`}>
              <EffectArt c={c} kind="steam" index={0} />
              <EffectArt c={c} kind="steam" index={1} />
            </G>
          ) : (
            <G key={e}>
              <EffectArt c={c} kind={e} index={0} />
              {TWIN_EFFECTS.includes(e) ? <EffectArt c={c} kind={e} index={1} /> : null}
            </G>
          ),
        )}
      </G>
    </Svg>
  );
}

/** Effects drawn as two pieces that move out of step (z + Z, two hearts, two sparkles). */
const TWIN_EFFECTS: Effect[] = ['zzz', 'hearts', 'sparkles'];

/** Where each effect turns, grows or falls from. */
const EFFECT_ORIGIN: Record<Effect, [{ x: number; y: number }, { x: number; y: number }?]> = {
  tear: [{ x: 80, y: 152 }],
  sweat: [{ x: 154, y: 92 }],
  zzz: [{ x: 145, y: 62 }, { x: 160, y: 44 }],
  hearts: [{ x: 150, y: 64 }, { x: 40, y: 55 }],
  sparkles: [{ x: 39, y: 69 }, { x: 162, y: 86 }],
  question: [{ x: 154, y: 56 }],
  exclaim: [{ x: 154, y: 58 }],
  confetti: [{ x: 100, y: 60 }],
  flame: [{ x: 176, y: 184 }],
  steam: [{ x: 11, y: -12 }, { x: 11, y: -12 }],
};

/**
 * A full-size view whose animated `style` turns and scales around `origin` (grid units).
 * Instead of `transformOrigin` (not applied to Reanimated-driven transforms on iOS, which
 * left the arms swinging around the middle of the drawing, away from the body), the view is
 * shifted so its centre sits on `origin`, transformed there, and its content shifted back.
 */
function Pivot({ size, origin, style, children }: { size: number; origin: { x: number; y: number }; style?: object; children: ReactNode }) {
  const k = size / 200;
  const dx = (origin.x - 100) * k;
  const dy = (origin.y - 100) * k;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: dx }, { translateY: dy }] }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: -dx }, { translateY: -dy }] }]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

/** A full-size SVG layer that turns and scales around `origin` (grid units). */
function Layer({ size, origin, style, children }: { size: number; origin?: { x: number; y: number }; style?: object; children: ReactNode }) {
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {children}
    </Svg>
  );
  if (origin) {
    return (
      <Pivot size={size} origin={origin} style={style}>
        {svg}
      </Pivot>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {svg}
    </Animated.View>
  );
}

const loop = (value: SharedValue<number>, to: number, duration: number, easing: EasingFunction | EasingFunctionFactory = ease('breath')) => {
  value.value = withRepeat(withTiming(to, { duration, easing }), -1, true);
};

function startBody(motion: BodyMotion, y: SharedValue<number>, sx: SharedValue<number>, sy: SharedValue<number>, rot: SharedValue<number>) {
  const squash = (to: number, d: number) => withTiming(to, { duration: d, easing: Easing.out(Easing.quad) });
  const { hopUp, hopDown } = MASCOT;
  switch (motion) {
    case 'hop':
    case 'jump': {
      const { height: h, pause } = motion === 'jump' ? LOOPS.jump : LOOPS.hop;
      y.value = withRepeat(
        withSequence(
          withTiming(h, { duration: hopUp, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: hopDown, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: LOOPS.hopLand + pause }),
        ),
        -1,
      );
      // Stretch in the air, squash on landing.
      const q = LOOPS.squash;
      sy.value = withRepeat(
        withSequence(squash(LOOPS.stretch.sy, hopUp), squash(1, hopDown), squash(q.sy, q.ms), squash(1, q.settle), withTiming(1, { duration: pause })),
        -1,
      );
      sx.value = withRepeat(
        withSequence(squash(LOOPS.stretch.sx, hopUp), squash(1, hopDown), squash(q.sx, q.ms), squash(1, q.settle), withTiming(1, { duration: pause })),
        -1,
      );
      return;
    }
    case 'droop':
      loop(sy, LOOPS.droop.sy, LOOPS.droop.syMs);
      loop(rot, LOOPS.droop.rot, LOOPS.droop.rotMs);
      return;
    case 'sway':
      rot.value = -LOOPS.sway.rot;
      loop(rot, LOOPS.sway.rot, LOOPS.sway.ms);
      loop(sy, LOOPS.sway.sy, LOOPS.sway.ms);
      return;
    case 'nod':
      loop(rot, LOOPS.nod.rot, LOOPS.nod.ms);
      loop(y, LOOPS.nod.y, LOOPS.nod.ms);
      return;
    case 'wobble':
      rot.value = -LOOPS.wobble.rot;
      loop(rot, LOOPS.wobble.rot, LOOPS.wobble.ms);
      return;
    case 'bob':
      loop(y, LOOPS.bob.y, LOOPS.bob.ms);
      loop(sy, LOOPS.bob.sy, LOOPS.bob.ms);
      return;
    default:
      // Breathing: rise a little, stretch up, settle.
      loop(sy, LOOPS.breathe.sy, LOOPS.breathe.ms);
      loop(sx, LOOPS.breathe.sx, LOOPS.breathe.ms);
      loop(y, LOOPS.breathe.y, LOOPS.breathe.ms);
  }
}

/** Little things Lumi does on its own now and then, by mood. */
type Fidget = 'look' | 'blink2' | 'hop' | 'flick' | 'tilt' | 'wiggle' | 'wave' | 'lookUp';
const FIDGETS: Partial<Record<MascotMood, Fidget[]>> = {
  idle: ['look', 'blink2', 'hop', 'flick', 'tilt', 'wave', 'look'],
  listening: ['look', 'tilt', 'blink2'],
  reading: ['blink2', 'flick', 'tilt', 'look'],
  study: ['look', 'blink2', 'flick'],
  focus: ['blink2', 'flick'],
  happy: ['look', 'flick', 'wiggle'],
  proud: ['look', 'flick', 'wiggle', 'hop'],
  wink: ['look', 'flick', 'hop'],
  love: ['wiggle', 'flick'],
  sad: ['blink2', 'look'],
  thinking: ['lookUp', 'flick', 'look'],
  talking: ['flick', 'tilt'],
  sleepy: ['flick'],
  break: ['look', 'blink2'],
  confused: ['look', 'flick'],
  graduate: ['flick', 'look'],
};

function startArm(motion: ArmMotion | undefined, osc: SharedValue<number>, side: 'l' | 'r') {
  const dir = side === 'l' ? 1 : -1;
  switch (motion) {
    case 'wave':
      osc.value = LOOPS.wave.from * dir;
      loop(osc, LOOPS.wave.to * dir, LOOPS.wave.ms);
      return;
    case 'wiggle':
      osc.value = LOOPS.wiggle.from * dir;
      loop(osc, LOOPS.wiggle.to * dir, LOOPS.wiggle.ms);
      return;
    case 'shake':
      osc.value = -LOOPS.shake.deg;
      loop(osc, LOOPS.shake.deg, LOOPS.shake.ms);
      return;
    case 'gesture':
      loop(osc, LOOPS.gesture.deg * -dir, LOOPS.gesture.ms);
      return;
    case 'tap':
      osc.value = withRepeat(
        withSequence(withTiming(LOOPS.tap.deg, { duration: LOOPS.tap.ms }), withTiming(0, { duration: LOOPS.tap.ms }), withTiming(0, { duration: LOOPS.tap.rest })),
        -1,
      );
      return;
    case 'scribble':
      osc.value = -LOOPS.scribble.deg;
      loop(osc, LOOPS.scribble.deg, LOOPS.scribble.ms);
      return;
    case 'sip':
      // Raise the cup now and then.
      osc.value = withRepeat(
        withSequence(
          withDelay(LOOPS.sip.delay, withTiming(LOOPS.sip.deg, { duration: LOOPS.sip.ms })),
          withTiming(LOOPS.sip.deg, { duration: LOOPS.sip.hold }),
          withTiming(0, { duration: LOOPS.sip.ms }),
        ),
        -1,
      );
      return;
    case 'pop':
      // Startled: both arms jolt outward, spring back, then rest a beat.
      osc.value = withRepeat(
        withSequence(
          withTiming(LOOPS.pop.deg * dir, { duration: LOOPS.pop.ms, easing: Easing.out(Easing.quad) }),
          withSpring(0, LOOPS.popSpring),
          withTiming(0, { duration: LOOPS.pop.rest }),
        ),
        -1,
      );
      return;
    case 'flap': {
      // Wings: a real down-and-up stroke, both arms in mirror (±flapDeg each stroke).
      const { flapDeg, flapPeriodMs } = MASCOT;
      osc.value = -flapDeg * dir;
      loop(osc, flapDeg * dir, flapPeriodMs, ease('standard'));
      return;
    }
    default:
      osc.value = 0;
  }
}

function LiveMascot({
  mood,
  pose,
  size,
  c,
  lookAt,
  enter: popIn,
}: {
  mood: MascotMood;
  pose: Pose;
  size: number;
  c: MascotColors;
  lookAt: -1 | 0 | 1;
  enter: boolean;
}) {
  const k = size / 200;

  // Pose values spring to the new mood; loops add on top.
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const armL = useSharedValue(pose.armL);
  const armR = useSharedValue(pose.armR);
  const bodyY = useSharedValue(0);
  const bodySX = useSharedValue(1);
  const bodySY = useSharedValue(1);
  const bodyRot = useSharedValue(0);
  const oscL = useSharedValue(0);
  const oscR = useSharedValue(0);
  const blink = useSharedValue(1);
  const sway = useSharedValue(0);
  const glow = useSharedValue(1);
  const glowDim = useSharedValue(pose.glow ?? 1);
  const talk = useSharedValue(1);
  const fxA = useSharedValue(0);
  const fxB = useSharedValue(0);
  const pop = useSharedValue(0);
  // Fidgets and reactions, added on top of the pose and its loop.
  const faceX = useSharedValue(0);
  const faceY = useSharedValue(0);
  const lookX = useSharedValue(lookAt * LOOPS.lookAtShift);
  const hopY = useSharedValue(0);
  const hopS = useSharedValue(1);
  const tiltX = useSharedValue(0);
  const kickTip = useSharedValue(0);
  const kickArmR = useSharedValue(0);
  const idleArm = useSharedValue(0);
  // Pops in on first show (unless swapped in for the still Lumi); squashes a little on every mood change.
  const enter = useSharedValue(popIn ? 0 : 1);
  const bump = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (popIn) enter.value = withSpring(1, LOOPS.enterSpring);
  }, [enter, popIn]);

  useEffect(() => {
    lookX.value = withSpring(lookAt * LOOPS.lookAtShift, LOOPS.fidgetSpring);
  }, [lookAt, lookX]);

  // Fidget scheduler: every few seconds, one small action that suits the mood.
  useEffect(() => {
    const list = FIDGETS[mood];
    if (!list?.length) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const spring = LOOPS.fidgetSpring;
    const act = (f: Fidget) => {
      switch (f) {
        case 'look': {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const L = LOOPS.look;
          faceX.value = withSequence(withSpring(L.x * dir, spring), withDelay(L.hold, withSpring(L.back * dir, spring)), withDelay(L.settle, withSpring(0, spring)));
          faceY.value = withSequence(withSpring(L.y, spring), withDelay(L.yHold, withSpring(0, spring)));
          return;
        }
        case 'lookUp':
          faceY.value = withSequence(withSpring(LOOPS.lookUp.y, spring), withDelay(LOOPS.lookUp.hold, withSpring(0, spring)));
          faceX.value = withSequence(withSpring(LOOPS.lookUp.x, spring), withDelay(LOOPS.lookUp.hold, withSpring(0, spring)));
          return;
        case 'blink2': {
          const b = LOOPS.blink;
          const b2 = LOOPS.blink2;
          blink.value = withSequence(
            withTiming(b.closed, { duration: b2.close }),
            withTiming(1, { duration: b2.open }),
            withTiming(b.closed, { duration: b2.close }),
            withTiming(1, { duration: b2.reopen }),
            withRepeat(withSequence(withDelay(b.every, withTiming(b.closed, { duration: b.close })), withTiming(1, { duration: b.open })), -1),
          );
          return;
        }
        case 'hop': {
          const h = LOOPS.fidgetHop;
          hopY.value = withSequence(withTiming(h.y, { duration: h.up, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: h.down, easing: Easing.in(Easing.quad) }));
          hopS.value = withSequence(withTiming(h.stretch, { duration: h.up }), withTiming(1, { duration: h.down }), withTiming(h.squash, { duration: h.squashMs }), withSpring(1, spring));
          return;
        }
        case 'flick':
          kickTip.value = withSequence(withTiming(LOOPS.flick.deg, { duration: LOOPS.flick.ms }), withSpring(0, LOOPS.flick.spring));
          return;
        case 'tilt': {
          const dir = Math.random() < 0.5 ? -1 : 1;
          tiltX.value = withSequence(withSpring(LOOPS.tilt.deg * dir, spring), withDelay(LOOPS.tilt.hold, withSpring(0, spring)));
          return;
        }
        case 'wiggle': {
          const { deg, ms } = LOOPS.shiver;
          tiltX.value = withSequence(withTiming(-deg, { duration: ms[0] }), withTiming(deg, { duration: ms[1] }), withTiming(-deg, { duration: ms[2] }), withSpring(0, spring));
          return;
        }
        case 'wave': {
          // A quick hello with the right arm (from its rest angle up to about -150°).
          const w = LOOPS.hello;
          kickArmR.value = withSequence(
            withSpring(w.up, spring),
            withRepeat(withSequence(withTiming(w.low, { duration: w.ms }), withTiming(w.high, { duration: w.ms })), w.times, true),
            withDelay(w.settle, withSpring(0, spring)),
          );
          faceX.value = withSequence(withSpring(w.face, spring), withDelay(w.faceHold, withSpring(0, spring)));
          return;
        }
      }
    };
    const [gapMin, gapMax] = MASCOT.fidget;
    const schedule = () => {
      t = setTimeout(() => {
        if (!alive) return;
        act(list[Math.floor(Math.random() * list.length)]!);
        schedule();
      }, gapMin + Math.random() * (gapMax - gapMin));
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [mood, faceX, faceY, blink, hopY, hopS, kickTip, tiltX, kickArmR]);

  useEffect(() => {
    const p = pose;
    const spring = MASCOT.poseSpring;
    lift.value = withSpring(p.lift ?? 0, spring);
    tilt.value = withSpring(p.tilt ?? 0, spring);
    armL.value = withSpring(p.armL, spring);
    armR.value = withSpring(p.armR, spring);
    glowDim.value = withTiming(p.glow ?? 1, { duration: LOOPS.glow.dimMs });

    for (const v of [bodyY, bodyRot, oscL, oscR, fxA, fxB, pop]) {
      cancelAnimation(v);
      v.value = 0;
    }
    for (const v of [bodySX, bodySY, talk, glow]) {
      cancelAnimation(v);
      v.value = 1;
    }
    startBody(p.body, bodyY, bodySX, bodySY, bodyRot);
    startArm(p.armMotionL, oscL, 'l');
    startArm(p.armMotionR, oscR, 'r');

    // A blink when the mood changes hides the swap of eyes and mouth; then every few seconds.
    const b = LOOPS.blink;
    blink.value = withSequence(
      withTiming(b.closed, { duration: b.close }),
      withTiming(1, { duration: MASCOT.blinkMs }),
      withRepeat(withSequence(withDelay(b.every, withTiming(b.closed, { duration: b.close })), withTiming(1, { duration: b.open })), -1),
    );
    sway.value = -LOOPS.tipSway.deg;
    loop(sway, LOOPS.tipSway.deg, LOOPS.tipSway.ms);
    loop(glow, p.pulse ? LOOPS.glow.pulse : LOOPS.glow.rest, p.pulse ? LOOPS.glow.pulseMs : LOOPS.glow.restMs);
    if (p.talk) {
      talk.value = LOOPS.talk.from;
      loop(talk, 1, LOOPS.talk.ms, Easing.linear);
    }
    fxA.value = withRepeat(withTiming(1, { duration: LOOPS.fxMs, easing: Easing.linear }), -1);
    fxB.value = withDelay(MASCOT.fxPhaseMs, withRepeat(withTiming(1, { duration: LOOPS.fxMs, easing: Easing.linear }), -1));
    pop.value = withSpring(1, LOOPS.popSpring);
    // Arms swing gently with the breath when they have nothing else to do.
    cancelAnimation(idleArm);
    idleArm.value = 0;
    if (!p.armMotionL && !p.armMotionR && p.body === 'breathe') loop(idleArm, LOOPS.idleArm.deg, LOOPS.idleArm.ms);
    // Fidgets from the previous mood settle.
    for (const v of [faceX, faceY, hopY, tiltX, kickTip, kickArmR]) v.value = withSpring(0, spring);
    hopS.value = withSpring(1, spring);
    if (first.current) first.current = false;
    else {
      const u = LOOPS.bump;
      bump.value = withSequence(withTiming(u.up, { duration: u.upMs }), withTiming(u.down, { duration: u.downMs }), withSpring(1, u.spring));
    }
  }, [
    pose, lift, tilt, armL, armR, glowDim, bodyY, bodyRot, oscL, oscR, talk, fxA, fxB, pop, glow, bodySX, bodySY, blink, sway,
    idleArm, faceX, faceY, hopY, hopS, tiltX, kickTip, kickArmR, bump,
  ]);

  const { enterFrom, enterRise } = MASCOT;
  const shadowStyle = useAnimatedStyle(() => {
    const up = Math.min(0, lift.value + bodyY.value + hopY.value);
    return { transform: [{ scaleX: (1 + up / 70) * (enterFrom + (1 - enterFrom) * enter.value) }], opacity: (1 + up / 60) * enter.value };
  });
  const rootStyle = useAnimatedStyle(() => {
    const grow = enterFrom + (1 - enterFrom) * enter.value;
    return {
      opacity: Math.min(1, enter.value * 2),
      transform: [
        { translateY: (lift.value + bodyY.value + hopY.value + (1 - enter.value) * enterRise) * k },
        { rotate: `${tilt.value + bodyRot.value + tiltX.value}deg` },
        { scaleX: bodySX.value * (2 - hopS.value) * grow * bump.value },
        { scaleY: bodySY.value * hopS.value * grow * (2 - bump.value) },
      ],
    };
  });
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (faceX.value + lookX.value) * k }, { translateY: faceY.value * k }] }));
  const tipStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value + kickTip.value}deg` }] }));
  const lightStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }], opacity: glowDim.value }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const mouthStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: talk.value }] }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.value + oscL.value + idleArm.value}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armR.value + oscR.value + kickArmR.value - idleArm.value}deg` }] }));
  const restR = pose.armR;
  const cupStyle = useAnimatedStyle(() => {
    // The cup follows the hand (it is drawn upright, so it moves rather than turns).
    const a = ((armR.value + oscR.value + kickArmR.value - idleArm.value) * Math.PI) / 180;
    const rest = (restR * Math.PI) / 180;
    const dx = (-Math.sin(a) + Math.sin(rest)) * ARM_LEN;
    const dy = (Math.cos(a) - Math.cos(rest)) * ARM_LEN;
    return { transform: [{ translateX: dx * k }, { translateY: dy * k }] };
  });

  const blinks = BLINKING_EYES.includes(pose.eyes);
  const cup = pose.held === 'cup' ? cupCorner(pose.armR) : null;
  const heldR = heldRight(pose);
  const faceWorn = wornOn(pose, true);
  const bodyWorn = wornOn(pose, false);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Layer size={size} origin={SHADOW_ORIGIN} style={shadowStyle}>
        <Shadow c={c} />
      </Layer>
      <Pivot size={size} origin={GROUND} style={rootStyle}>
        <Layer size={size}>
          <Feet c={c} />
        </Layer>
        <Pivot size={size} origin={TIP_BASE} style={tipStyle}>
          <Layer size={size}>
            <Tip c={c} />
          </Layer>
          <Layer size={size} origin={LIGHT} style={lightStyle}>
            <TipLight c={c} />
          </Layer>
        </Pivot>
        <Layer size={size}>
          <Body c={c} blush={pose.blush} />
        </Layer>
        <Animated.View style={[StyleSheet.absoluteFill, faceStyle]}>
          <Layer size={size} origin={{ x: 100, y: EYE_Y }} style={blinks ? eyesStyle : undefined}>
            <Eyes c={c} kind={pose.eyes} />
          </Layer>
          {pose.brows ? (
            <Layer size={size}>
              <Brows c={c} kind={pose.brows} />
            </Layer>
          ) : null}
          <Layer size={size} origin={MOUTH} style={pose.talk ? mouthStyle : undefined}>
            <Mouth c={c} kind={pose.mouth} />
          </Layer>
          {/* Glasses move with the face (their own layer, so a blink doesn't squash them). */}
          {faceWorn.length ? (
            <Layer size={size}>
              {faceWorn.map((w) => (
                <Worn key={w} c={c} item={w} />
              ))}
            </Layer>
          ) : null}
        </Animated.View>
        {bodyWorn.length ? (
          <Layer size={size}>
            {bodyWorn.map((w) => (
              <Worn key={w} c={c} item={w} />
            ))}
          </Layer>
        ) : null}
        <Layer size={size} origin={PIVOT.l} style={armLStyle}>
          <Arm c={c} side="l" held={pose.held === 'pompoms' ? 'pompom' : undefined} />
        </Layer>
        <Layer size={size} origin={PIVOT.r} style={armRStyle}>
          <Arm c={c} side="r" held={heldR} />
        </Layer>
        {cup ? (
          // The steam rises from the cup wherever the sip takes it.
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, cupStyle]}>
            <Layer size={size}>
              <Cup c={c} x={cup.x} y={cup.y} />
            </Layer>
            {pose.effects?.includes('steam') ? <EffectLayer kind="steam" size={size} c={c} a={fxA} b={fxB} pop={pop} cup={cup} /> : null}
          </Animated.View>
        ) : null}
        {(pose.effects ?? [])
          .filter((e) => !(e === 'steam' && cup))
          .map((e) => (
            <EffectLayer key={e} kind={e} size={size} c={c} a={fxA} b={fxB} pop={pop} cup={cup} />
          ))}
      </Pivot>
    </View>
  );
}

/** One effect (or its two pieces), each with its own little loop. */
function EffectLayer({
  kind,
  size,
  c,
  a,
  b,
  pop,
  cup,
}: {
  kind: Effect;
  size: number;
  c: MascotColors;
  a: SharedValue<number>;
  b: SharedValue<number>;
  pop: SharedValue<number>;
  cup: { x: number; y: number } | null;
}) {
  const k = size / 200;
  const [o1, o2] = EFFECT_ORIGIN[kind];
  const first = useAnimatedStyle(() => effectStyle(kind, a.value, pop.value, k, 0));
  const second = useAnimatedStyle(() => effectStyle(kind, b.value, pop.value, k, 1));
  if (kind === 'steam') {
    if (!cup) return null;
    const origin = { x: cup.x + 11, y: cup.y - 12 };
    return (
      <>
        <Layer size={size} origin={origin} style={first}>
          <G transform={`translate(${cup.x} ${cup.y})`}>
            <EffectArt c={c} kind="steam" index={0} />
          </G>
        </Layer>
        <Layer size={size} origin={origin} style={second}>
          <G transform={`translate(${cup.x} ${cup.y})`}>
            <EffectArt c={c} kind="steam" index={1} />
          </G>
        </Layer>
      </>
    );
  }
  return (
    <>
      <Layer size={size} origin={o1} style={first}>
        <EffectArt c={c} kind={kind} index={0} />
      </Layer>
      {TWIN_EFFECTS.includes(kind) && o2 ? (
        <Layer size={size} origin={o2} style={second}>
          <EffectArt c={c} kind={kind} index={1} />
        </Layer>
      ) : null}
    </>
  );
}

/** The style of an effect at loop progress `t` (0 → 1), `pop` springing 0 → 1 on entry. */
function effectStyle(kind: Effect, t: number, pop: number, k: number, piece: number) {
  'worklet';
  const wave = Math.sin(t * Math.PI * 2);
  const fadeInOut = Math.sin(t * Math.PI);
  const f = LOOPS.fx;
  switch (kind) {
    case 'tear':
      return { opacity: 1 - t, transform: [{ translateY: t * f.tear.fall * k }] };
    case 'sweat':
      return { opacity: 1 - t * f.sweat.fade, transform: [{ translateY: t * f.sweat.fall * k }] };
    case 'zzz':
      return { opacity: fadeInOut, transform: [{ translateX: t * f.zzz.x * k }, { translateY: -t * f.zzz.rise * k }, { scale: f.zzz.from + t * f.zzz.grow }] };
    case 'hearts':
      return { opacity: fadeInOut, transform: [{ translateY: -t * f.hearts.rise * k }, { scale: f.hearts.from + fadeInOut * f.hearts.grow }] };
    case 'sparkles':
      return {
        opacity: f.sparkles.dim + fadeInOut * (1 - f.sparkles.dim),
        transform: [{ scale: f.sparkles.from + fadeInOut * f.sparkles.grow }, { rotate: `${t * f.sparkles.turn}deg` }],
      };
    case 'question':
      return { transform: [{ translateY: wave * f.question.bob * k }, { rotate: `${wave * f.question.turn}deg` }, { scale: pop }] };
    case 'exclaim':
      return { transform: [{ scale: pop * (1 + f.exclaim.pulse * wave) }, { translateY: wave * f.exclaim.bob * k }] };
    case 'confetti':
      return { opacity: 1 - t * f.confetti.fade, transform: [{ translateY: t * f.confetti.fall * k }, { rotate: `${wave * f.confetti.turn}deg` }] };
    case 'flame':
      return {
        transform: [{ scaleY: f.flame.from + f.flame.flicker * Math.abs(Math.sin(t * Math.PI * f.flame.rate)) }, { scaleX: 1 - f.flame.sway * wave }],
      };
    case 'steam':
      return {
        opacity: fadeInOut * f.steam.opacity,
        transform: [{ translateY: -t * f.steam.rise * k }, { translateX: (piece ? 1 : -1) * wave * f.steam.drift * k }],
      };
    default:
      return {};
  }
}
