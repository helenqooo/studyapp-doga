import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
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
import { useTheme, type MascotColors } from '../../theme';
import {
  ANTENNA_BASE,
  AntennaLight,
  AntennaStem,
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
  Worn,
  type Effect,
} from './parts';
import { HIDES_ANTENNA, POSES, type ArmMotion, type BodyMotion, type MascotMood, type Pose } from './poses';

export type { MascotMood } from './poses';

interface Props {
  mood?: MascotMood;
  size?: number;
  /** No motion (e.g. small avatars in a long list). Reduced motion also keeps it still. */
  still?: boolean;
  /** Reacts to a tap (a little jump and a happy face). On by default from note size up. */
  interactive?: boolean;
}

/** What Lumi does when tapped, in turn. */
const TAP_REACTIONS: MascotMood[] = ['happy', 'wink', 'love', 'surprised', 'celebrate'];
const REACTION_MS = 1600;

/**
 * Lumi, the assistant: a little flat light-creature with a glowing antenna. Each mood has
 * a pose (eyes, mouth, arms, props) and a loop (breathing, waving, hopping…); switching
 * moods springs the arms over to the new pose. Between those, Lumi fidgets on its own:
 * looks around, blinks twice, hops, flicks its antenna, waves. Tapping it gets a reaction.
 * Decorative: what it "says" is in text.
 */
export function Mascot({ mood = 'idle', size, still = false, interactive }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const s = size ?? theme.layout.mascot.note;
  const c = theme.colors.mascot;
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const shown = reaction ?? mood;
  const body =
    still || reduceMotion ? <StillMascot pose={POSES[shown]} size={s} c={c} /> : <LiveMascot mood={shown} size={s} c={c} />;
  const canTap = interactive ?? s >= theme.layout.mascot.note;
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
      onPress={() => {
        haptics.tap();
        setReaction(TAP_REACTIONS[taps.current++ % TAP_REACTIONS.length]!);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setReaction(null), REACTION_MS);
      }}
      style={{ width: s, height: s }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {body}
      </View>
    </Pressable>
  );
}

const hasAntenna = (pose: Pose) => !(pose.worn ?? []).some((w) => HIDES_ANTENNA.includes(w));
const cupCorner = (angle: number) => {
  const h = handAt('r', angle);
  return { x: h.x - 12, y: h.y - 14 };
};

/** The pose drawn once, in a single SVG. */
function StillMascot({ pose, size, c }: { pose: Pose; size: number; c: MascotColors }) {
  const lift = pose.lift ?? 0;
  const cup = pose.held === 'cup' ? cupCorner(pose.armR) : null;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Shadow c={c} rx={46 - Math.abs(lift)} />
      <G transform={`translate(0 ${lift}) rotate(${pose.tilt ?? 0} ${GROUND.x} ${GROUND.y})`}>
        <Feet c={c} />
        {hasAntenna(pose) ? (
          <G>
            <AntennaStem c={c} />
            <G opacity={pose.glow ?? 1}>
              <AntennaLight c={c} />
            </G>
          </G>
        ) : null}
        <Body c={c} blush={pose.blush} />
        <Eyes c={c} kind={pose.eyes} />
        {pose.brows ? <Brows c={c} kind={pose.brows} /> : null}
        <Mouth c={c} kind={pose.mouth} />
        {(pose.worn ?? []).map((w) => (
          <Worn key={w} c={c} item={w} />
        ))}
        <Arm c={c} side="l" angle={pose.armL} held={pose.held === 'pompoms' ? 'pompom' : undefined} />
        <Arm c={c} side="r" angle={pose.armR} held={pose.held === 'pompoms' ? 'pompom' : pose.held === 'pencil' ? 'pencil' : undefined} />
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
  tear: [{ x: 74, y: 130 }],
  sweat: [{ x: 148, y: 84 }],
  zzz: [{ x: 145, y: 62 }, { x: 160, y: 44 }],
  hearts: [{ x: 150, y: 64 }, { x: 40, y: 55 }],
  sparkles: [{ x: 41, y: 73 }, { x: 162, y: 86 }],
  question: [{ x: 154, y: 56 }],
  exclaim: [{ x: 154, y: 58 }],
  confetti: [{ x: 100, y: 60 }],
  flame: [{ x: 176, y: 150 }],
  steam: [{ x: 11, y: -12 }, { x: 11, y: -12 }],
};

/** A full-size SVG layer that turns and scales around `origin` (grid units). */
function Layer({ size, origin, style, children }: { size: number; origin?: { x: number; y: number }; style?: object; children: ReactNode }) {
  const k = size / 200;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, origin ? { transformOrigin: `${origin.x * k}px ${origin.y * k}px` } : null, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {children}
      </Svg>
    </Animated.View>
  );
}

const loop = (value: SharedValue<number>, to: number, duration: number, easing = Easing.inOut(Easing.sin)) => {
  value.value = withRepeat(withTiming(to, { duration, easing }), -1, true);
};

function startBody(motion: BodyMotion, y: SharedValue<number>, sx: SharedValue<number>, sy: SharedValue<number>, rot: SharedValue<number>) {
  const squash = (to: number, d: number) => withTiming(to, { duration: d, easing: Easing.out(Easing.quad) });
  switch (motion) {
    case 'hop':
    case 'jump': {
      const h = motion === 'jump' ? -22 : -10;
      const pause = motion === 'jump' ? 220 : 520;
      y.value = withRepeat(
        withSequence(
          withTiming(h, { duration: 240, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 260 + pause }),
        ),
        -1,
      );
      // Stretch in the air, squash on landing.
      sy.value = withRepeat(
        withSequence(squash(1.06, 240), squash(1, 220), squash(0.9, 110), squash(1, 150), withTiming(1, { duration: pause })),
        -1,
      );
      sx.value = withRepeat(
        withSequence(squash(0.96, 240), squash(1, 220), squash(1.08, 110), squash(1, 150), withTiming(1, { duration: pause })),
        -1,
      );
      return;
    }
    case 'droop':
      loop(sy, 0.985, 2200);
      loop(rot, 2, 2400);
      return;
    case 'sway':
      rot.value = -4;
      loop(rot, 4, 900);
      loop(sy, 1.02, 900);
      return;
    case 'nod':
      loop(rot, 2.5, 480);
      loop(y, 1.5, 480);
      return;
    case 'wobble':
      rot.value = -6;
      loop(rot, 6, 700);
      return;
    case 'bob':
      loop(y, -5, 650);
      loop(sy, 1.02, 650);
      return;
    default:
      // Breathing: rise a little, stretch up, settle.
      loop(sy, 1.045, 1300);
      loop(sx, 0.975, 1300);
      loop(y, -3, 1300);
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
      osc.value = 14 * dir;
      loop(osc, -16 * dir, 280);
      return;
    case 'wiggle':
      osc.value = -10 * dir;
      loop(osc, 12 * dir, 220);
      return;
    case 'shake':
      osc.value = -14;
      loop(osc, 14, 140);
      return;
    case 'gesture':
      loop(osc, 20 * -dir, 760);
      return;
    case 'tap':
      osc.value = withRepeat(withSequence(withTiming(-6, { duration: 160 }), withTiming(0, { duration: 160 }), withTiming(0, { duration: 700 })), -1);
      return;
    case 'scribble':
      osc.value = -6;
      loop(osc, 6, 110);
      return;
    case 'sip':
      // Raise the cup now and then.
      osc.value = withRepeat(
        withSequence(withDelay(1800, withTiming(-48, { duration: 420 })), withTiming(-48, { duration: 700 }), withTiming(0, { duration: 420 })),
        -1,
      );
      return;
    default:
      osc.value = 0;
  }
}

function LiveMascot({ mood, size, c }: { mood: MascotMood; size: number; c: MascotColors }) {
  const pose = POSES[mood];
  const k = size / 200;

  // Pose values spring to the new mood; loops add on top.
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const armL = useSharedValue(28);
  const armR = useSharedValue(-28);
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
  const hopY = useSharedValue(0);
  const hopS = useSharedValue(1);
  const tiltX = useSharedValue(0);
  const kickAntenna = useSharedValue(0);
  const kickArmR = useSharedValue(0);
  const idleArm = useSharedValue(0);
  // Pops in on first show; squashes a little on every mood change.
  const enter = useSharedValue(0);
  const bump = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 9, stiffness: 150, mass: 0.7 });
  }, [enter]);

  // Fidget scheduler: every few seconds, one small action that suits the mood.
  useEffect(() => {
    const list = FIDGETS[mood];
    if (!list?.length) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const spring = { damping: 12, stiffness: 160 };
    const act = (f: Fidget) => {
      switch (f) {
        case 'look': {
          const dir = Math.random() < 0.5 ? -1 : 1;
          faceX.value = withSequence(withSpring(5 * dir, spring), withDelay(700, withSpring(-3 * dir, spring)), withDelay(500, withSpring(0, spring)));
          faceY.value = withSequence(withSpring(-1, spring), withDelay(1200, withSpring(0, spring)));
          return;
        }
        case 'lookUp':
          faceY.value = withSequence(withSpring(-4, spring), withDelay(900, withSpring(0, spring)));
          faceX.value = withSequence(withSpring(4, spring), withDelay(900, withSpring(0, spring)));
          return;
        case 'blink2':
          blink.value = withSequence(
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 80 }),
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 90 }),
            withRepeat(withSequence(withDelay(3400, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 100 })), -1),
          );
          return;
        case 'hop':
          hopY.value = withSequence(withTiming(-14, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }));
          hopS.value = withSequence(withTiming(1.05, { duration: 200 }), withTiming(1, { duration: 190 }), withTiming(0.9, { duration: 90 }), withSpring(1, spring));
          return;
        case 'flick':
          kickAntenna.value = withSequence(withTiming(-22, { duration: 120 }), withSpring(0, { damping: 5, stiffness: 180 }));
          return;
        case 'tilt': {
          const dir = Math.random() < 0.5 ? -1 : 1;
          tiltX.value = withSequence(withSpring(7 * dir, spring), withDelay(900, withSpring(0, spring)));
          return;
        }
        case 'wiggle':
          tiltX.value = withSequence(withTiming(-5, { duration: 90 }), withTiming(5, { duration: 120 }), withTiming(-4, { duration: 120 }), withSpring(0, spring));
          return;
        case 'wave':
          // A quick hello with the right arm (from its rest angle up to about -150°).
          kickArmR.value = withSequence(
            withSpring(-122, spring),
            withRepeat(withSequence(withTiming(-104, { duration: 170 }), withTiming(-136, { duration: 170 })), 3, true),
            withDelay(150, withSpring(0, spring)),
          );
          faceX.value = withSequence(withSpring(-2, spring), withDelay(1300, withSpring(0, spring)));
          return;
      }
    };
    const schedule = () => {
      t = setTimeout(() => {
        if (!alive) return;
        act(list[Math.floor(Math.random() * list.length)]!);
        schedule();
      }, 2200 + Math.random() * 3200);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [mood, faceX, faceY, blink, hopY, hopS, kickAntenna, tiltX, kickArmR]);

  useEffect(() => {
    const p = POSES[mood];
    const spring = { damping: 13, stiffness: 140, mass: 0.8 };
    lift.value = withSpring(p.lift ?? 0, spring);
    tilt.value = withSpring(p.tilt ?? 0, spring);
    armL.value = withSpring(p.armL, spring);
    armR.value = withSpring(p.armR, spring);
    glowDim.value = withTiming(p.glow ?? 1, { duration: 500 });

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
    blink.value = withSequence(
      withTiming(0.1, { duration: 70 }),
      withTiming(1, { duration: 110 }),
      withRepeat(withSequence(withDelay(3400, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 100 })), -1),
    );
    sway.value = -5;
    loop(sway, 5, 1700);
    loop(glow, p.pulse ? 1.35 : 1.12, p.pulse ? 420 : 1500);
    if (p.talk) {
      talk.value = 0.35;
      loop(talk, 1, 130, Easing.linear);
    }
    fxA.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1);
    fxB.value = withDelay(750, withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1));
    pop.value = withSpring(1, { damping: 7, stiffness: 160 });
    // Arms swing gently with the breath when they have nothing else to do.
    cancelAnimation(idleArm);
    idleArm.value = 0;
    if (!p.armMotionL && !p.armMotionR && p.body === 'breathe') loop(idleArm, 5, 1300);
    // Fidgets from the previous mood settle.
    for (const v of [faceX, faceY, hopY, tiltX, kickAntenna, kickArmR]) v.value = withSpring(0, spring);
    hopS.value = withSpring(1, spring);
    if (first.current) first.current = false;
    else bump.value = withSequence(withTiming(1.08, { duration: 110 }), withTiming(0.95, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 200 }));
  }, [
    mood, lift, tilt, armL, armR, glowDim, bodyY, bodyRot, oscL, oscR, talk, fxA, fxB, pop, glow, bodySX, bodySY, blink, sway,
    idleArm, faceX, faceY, hopY, hopS, tiltX, kickAntenna, kickArmR, bump,
  ]);

  const shadowStyle = useAnimatedStyle(() => {
    const up = Math.min(0, lift.value + bodyY.value + hopY.value);
    return { transform: [{ scaleX: (1 + up / 70) * (0.4 + 0.6 * enter.value) }], opacity: (1 + up / 60) * enter.value };
  });
  const rootStyle = useAnimatedStyle(() => {
    const grow = 0.4 + 0.6 * enter.value;
    return {
      opacity: Math.min(1, enter.value * 2),
      transform: [
        { translateY: (lift.value + bodyY.value + hopY.value + (1 - enter.value) * 18) * k },
        { rotate: `${tilt.value + bodyRot.value + tiltX.value}deg` },
        { scaleX: bodySX.value * (2 - hopS.value) * grow * bump.value },
        { scaleY: bodySY.value * hopS.value * grow * (2 - bump.value) },
      ],
    };
  });
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateX: faceX.value * k }, { translateY: faceY.value * k }] }));
  const antennaStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value + kickAntenna.value}deg` }] }));
  const lightStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }], opacity: glowDim.value }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const mouthStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: talk.value }] }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.value + oscL.value + idleArm.value}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armR.value + oscR.value + kickArmR.value - idleArm.value}deg` }] }));
  const cupStyle = useAnimatedStyle(() => {
    // The cup follows the hand (it is drawn upright, so it moves rather than turns).
    const a = ((armR.value + oscR.value + kickArmR.value - idleArm.value) * Math.PI) / 180;
    const rest = (pose.armR * Math.PI) / 180;
    const dx = (-Math.sin(a) + Math.sin(rest)) * ARM_LEN;
    const dy = (Math.cos(a) - Math.cos(rest)) * ARM_LEN;
    return { transform: [{ translateX: dx * k }, { translateY: dy * k }] };
  });

  const blinks = BLINKING_EYES.includes(pose.eyes);
  const cup = pose.held === 'cup' ? cupCorner(pose.armR) : null;
  const heldR = pose.held === 'pompoms' ? 'pompom' : pose.held === 'pencil' ? 'pencil' : undefined;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Layer size={size} origin={{ x: 100, y: 190 }} style={shadowStyle}>
        <Shadow c={c} />
      </Layer>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${GROUND.x * k}px ${GROUND.y * k}px` }, rootStyle]}>
        <Layer size={size}>
          <Feet c={c} />
        </Layer>
        {hasAntenna(pose) ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${ANTENNA_BASE.x * k}px ${ANTENNA_BASE.y * k}px` }, antennaStyle]}>
            <Layer size={size}>
              <AntennaStem c={c} />
            </Layer>
            <Layer size={size} origin={LIGHT} style={lightStyle}>
              <AntennaLight c={c} />
            </Layer>
          </Animated.View>
        ) : null}
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
        </Animated.View>
        {(pose.worn ?? []).length ? (
          <Layer size={size}>
            {(pose.worn ?? []).map((w) => (
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
          <Layer size={size} style={cupStyle}>
            <Cup c={c} x={cup.x} y={cup.y} />
          </Layer>
        ) : null}
        {(pose.effects ?? []).map((e) => (
          <EffectLayer key={e} kind={e} size={size} c={c} a={fxA} b={fxB} pop={pop} cup={cup} />
        ))}
      </Animated.View>
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
  switch (kind) {
    case 'tear':
      return { opacity: 1 - t, transform: [{ translateY: t * 22 * k }] };
    case 'sweat':
      return { opacity: 1 - t * 0.7, transform: [{ translateY: t * 8 * k }] };
    case 'zzz':
      return { opacity: fadeInOut, transform: [{ translateX: t * 8 * k }, { translateY: -t * 14 * k }, { scale: 0.8 + t * 0.35 }] };
    case 'hearts':
      return { opacity: fadeInOut, transform: [{ translateY: -t * 18 * k }, { scale: 0.7 + fadeInOut * 0.4 }] };
    case 'sparkles':
      return { opacity: 0.4 + fadeInOut * 0.6, transform: [{ scale: 0.5 + fadeInOut * 0.7 }, { rotate: `${t * 90}deg` }] };
    case 'question':
      return { transform: [{ translateY: wave * 3 * k }, { rotate: `${wave * 8}deg` }, { scale: pop }] };
    case 'exclaim':
      return { transform: [{ scale: pop * (1 + 0.06 * wave) }, { translateY: wave * 1.5 * k }] };
    case 'confetti':
      return { opacity: 1 - t * 0.8, transform: [{ translateY: t * 26 * k }, { rotate: `${wave * 10}deg` }] };
    case 'flame':
      return { transform: [{ scaleY: 0.9 + 0.12 * Math.abs(Math.sin(t * Math.PI * 6)) }, { scaleX: 1 - 0.05 * wave }] };
    case 'steam':
      return { opacity: fadeInOut * 0.9, transform: [{ translateY: -t * 8 * k }, { translateX: (piece ? 1 : -1) * wave * 1.5 * k }] };
    default:
      return {};
  }
}
