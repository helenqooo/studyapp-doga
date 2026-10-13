import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, type EasingFunctionFactory } from 'react-native-reanimated';
import { motion, type EasingName, type SpringName } from '../../theme';

// Shared motion recipes, built from theme.motion. Layout animations keep the native/web
// split: on web, custom keyframes (withInitialValues, springify, LinearTransition) get
// pinned in place or jump, so the browser preview uses the stock presets.

const native = Platform.OS !== 'web';

const eases: Partial<Record<EasingName, EasingFunctionFactory>> = {};

/** A theme easing (bezier) for withTiming and layout animation builders. */
export function ease(name: EasingName): EasingFunctionFactory {
  const cached = eases[name];
  if (cached) return cached;
  const [x1, y1, x2, y2] = motion.easing[name];
  const made = Easing.bezier(x1, y1, x2, y2);
  eases[name] = made;
  return made;
}

/** A theme spring config for withSpring (a fresh copy, safe to extend). */
export function spring(name: SpringName): { damping: number; stiffness: number; mass: number } {
  return { ...motion.springs[name] };
}

interface EnterOptions {
  /** Position in a staggered group; the delay is capped at `motion.staggerMax` steps. */
  index?: number;
  /** Extra delay (ms). */
  delay?: number;
  /** Fade only, without the upward drift. */
  still?: boolean;
  /** Defaults to `motion.duration.slow`. */
  duration?: number;
}

/**
 * Content arriving because of an action (hints, verdicts, a refreshed grid): a fade with
 * an 8 pt rise on the enter easing. Layout animations follow the system Reduce Motion.
 */
export function enter({ index = 0, delay = 0, still = false, duration = motion.duration.slow }: EnterOptions = {}) {
  const wait = delay + Math.min(index, motion.staggerMax) * motion.stagger;
  if (still) return FadeIn.duration(duration).delay(wait);
  if (!native) return FadeInDown.duration(duration).delay(wait);
  return FadeInDown.duration(duration)
    .delay(wait)
    .easing(ease('enter'))
    .withInitialValues({ opacity: 0, transform: [{ translateY: motion.rise }] });
}

/** Leaving content: a quick fade. */
export function exit(duration: number = motion.duration.fast) {
  return FadeOut.duration(duration);
}

/** List reflow after a filter change: a spring on native, none on web. */
export function listLayout() {
  if (!native) return undefined;
  const s = motion.springs.thumb;
  return LinearTransition.springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass);
}
