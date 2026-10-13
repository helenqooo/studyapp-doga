import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, Path } from 'react-native-svg';
import { useWindowLayout } from '../lib/layout';
import { useTheme, type Theme, type TypeVariant } from '../theme';
import { AppText } from './AppText';
import { ease } from './motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion / small-bubble opacity swap, spec 0.7 and 5.6)
const RM_FADE_MS = 120;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type BubbleSize = 'dot' | 'row' | 'tab' | 'letter';
export type BubbleTone = 'mark' | 'success' | 'danger' | 'neutral' | 'accent';
export type BubbleVerdict = 'check' | 'pen' | 'dash';

interface Props {
  size?: BubbleSize;
  /** The bubble is marked: a scribble fills it, then the solid fill fades in. */
  filled?: boolean;
  /** A partial fill, 0..1 from the left (progress). Ignored while `filled`. */
  fill?: number;
  /** The fill color: the student's mark by default. */
  tone?: BubbleTone;
  /** Drawn over the bubble: a check, a red-pen loop around it, or a dash (blank). */
  verdict?: BubbleVerdict;
  /** Draw changes (default true). Off: changes cross-fade in 120 ms. Mounting never animates. */
  animate?: boolean;
  /**
   * A letter (string) or an icon. Pass a function to get the right color for each layer
   * (`text` on the empty bubble, the tone's ink on the fill), e.g. `(c) => <Icon color={c} … />`.
   */
  children?: ReactNode | ((color: string) => ReactNode);
  style?: StyleProp<ViewStyle>;
}

/** Fill and ink per tone. Status fills are the *Strong ones, so white ink reads on them. */
function toneColors(theme: Theme, tone: BubbleTone): { fill: string; ink: string } {
  const c = theme.colors;
  switch (tone) {
    case 'success':
      return { fill: c.successStrong, ink: c.textOnAccent };
    case 'danger':
      return { fill: c.dangerStrong, ink: c.textOnAccent };
    case 'neutral':
      return { fill: c.neutralStrong, ink: c.textOnAccent };
    case 'accent':
      return { fill: c.accent, ink: c.highlightInk };
    default:
      return { fill: c.mark, ink: c.markInk };
  }
}

const TEXT_VARIANT: Record<BubbleSize, TypeVariant> = { dot: 'micro', row: 'caption', tab: 'label', letter: 'heading' };

function polyLength(pts: [number, number][]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}
const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');

/**
 * An optik-form bubble (ellipse 1.6:1, printed `optik` outline): the app's mark for "chosen",
 * "done" and "now". Filling it scribbles a 6-stroke zigzag inside the oval (200 ms `pencil`),
 * then the solid fill fades in (90 ms); emptying erases it (shrinks to 0.82 and fades, 140 ms).
 * A verdict draws a check, a red-pen loop (380° from −30°, 320 ms) or a dash. Tone changes
 * cross-fade. Bubbles under 28 pt wide, Reduce Motion and `animate={false}` swap opacity in
 * 120 ms instead. Presentational: the parent owns the press target and the accessibility label.
 */
export function Bubble({ size = 'letter', filled = false, fill, tone = 'mark', verdict, animate = true, children, style }: Props) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const { bubble } = theme.layout;
  const { scribble, duration } = theme.motion;

  const dims = size === 'tab' ? theme.layout.tabBar.bubble[tablet ? 'tablet' : 'compact'] : bubble[size];
  const { w, h } = dims;
  const quiet = reduceMotion || !animate || w < bubble.scribbleMinWidth;
  const clipId = `bubble${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // The fill: the whole group fades/shrinks on erase; inside it the scribble draws, then the solid.
  const group = useSharedValue(filled ? 1 : 0);
  const groupScale = useSharedValue(1);
  const stroke = useSharedValue(filled ? 1 : 0);
  const solid = useSharedValue(filled ? 1 : 0);
  const partial = useSharedValue(filled ? 0 : clamp01(fill ?? 0));

  // Effects play only on a change (never on mount), compared with the last value they saw.
  const seenFilled = useRef(filled);
  useEffect(() => {
    if (seenFilled.current === filled) return;
    seenFilled.current = filled;
    const never = { reduceMotion: ReduceMotion.Never };
    if (filled) {
      groupScale.value = 1;
      if (quiet) {
        stroke.value = 1;
        solid.value = 1;
        group.value = withTiming(1, { duration: RM_FADE_MS, ...never });
        return;
      }
      group.value = 1;
      stroke.value = 0;
      solid.value = 0;
      stroke.value = withTiming(1, { duration: scribble.ms, easing: ease('pencil'), ...never });
      solid.value = withDelay(scribble.ms, withTiming(1, { duration: scribble.fillFade, ...never }));
    } else {
      if (quiet) {
        group.value = withTiming(0, { duration: RM_FADE_MS, ...never });
        return;
      }
      group.value = withTiming(0, { duration: scribble.eraseMs, easing: ease('exit'), ...never });
      groupScale.value = withTiming(scribble.eraseScale, { duration: scribble.eraseMs, easing: ease('exit'), ...never });
    }
    // Only a change of `filled` plays; `quiet` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  const seenFill = useRef(filled ? 0 : clamp01(fill ?? 0));
  useEffect(() => {
    const to = filled ? 0 : clamp01(fill ?? 0);
    if (seenFill.current === to) return;
    seenFill.current = to;
    partial.value = reduceMotion ? to : withTiming(to, { duration: duration.base, easing: ease('standard') });
  }, [fill, filled, reduceMotion, duration.base, partial]);

  // Tone changes cross-fade: the previous tone stays on top and fades out (keyed remount).
  const [toneState, setToneState] = useState<{ cur: BubbleTone; from: BubbleTone | null; n: number }>({ cur: tone, from: null, n: 0 });
  if (toneState.cur !== tone) setToneState({ cur: tone, from: toneState.cur, n: toneState.n + 1 });

  // The verdict: the last one stays mounted so removing it can fade out.
  const lastVerdict = useRef(verdict);
  if (verdict) lastVerdict.current = verdict;
  const shownVerdict = lastVerdict.current;
  const verdictOn = useSharedValue(verdict ? 1 : 0);
  const [verdictKey, setVerdictKey] = useState(0);
  const playVerdict = useRef(false);
  const prevVerdict = useRef(verdict);
  if (prevVerdict.current !== verdict) {
    prevVerdict.current = verdict;
    if (verdict) {
      playVerdict.current = !quiet;
      setVerdictKey((k) => k + 1);
    }
  }
  const seenVerdict = useRef(verdict);
  useEffect(() => {
    if (seenVerdict.current === verdict) return;
    seenVerdict.current = verdict;
    if (verdict) {
      verdictOn.value = quiet ? withTiming(1, { duration: RM_FADE_MS, reduceMotion: ReduceMotion.Never }) : 1;
    } else {
      verdictOn.value = withTiming(0, { duration: quiet ? RM_FADE_MS : duration.fast, reduceMotion: ReduceMotion.Never });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict]);

  // A check or dash stands in for the letter; the red pen circles it and leaves it readable.
  const hideContent = verdict === 'check' || verdict === 'dash';
  const content = useSharedValue(hideContent ? 0 : 1);
  const seenHide = useRef(hideContent);
  useEffect(() => {
    if (seenHide.current === hideContent) return;
    seenHide.current = hideContent;
    content.value = withTiming(hideContent ? 0 : 1, { duration: quiet ? RM_FADE_MS : duration.fast, reduceMotion: ReduceMotion.Never });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideContent]);

  const groupStyle = useAnimatedStyle(() => ({ opacity: group.value, transform: [{ scale: groupScale.value }] }));
  const solidStyle = useAnimatedStyle(() => ({ opacity: solid.value }));
  const partialStyle = useAnimatedStyle(() => ({ width: w * partial.value }), [w]);
  const verdictStyle = useAnimatedStyle(() => ({ opacity: verdictOn.value }));

  // The scribble: a zigzag of `scribble.strokes` strokes, clipped to the oval, overshooting it.
  const sw = bubble.scribbleStroke;
  const zig: [number, number][] = [];
  for (let i = 0; i <= scribble.strokes; i++) zig.push([(w * i) / scribble.strokes, i % 2 ? h + sw : -sw]);
  const zigLen = polyLength(zig);
  const zigProps = useAnimatedProps(() => ({ strokeDashoffset: zigLen * (1 - stroke.value) }), [zigLen]);

  const colors = toneColors(theme, toneState.cur);
  const outline = { cx: w / 2, cy: h / 2, rx: w / 2 - bubble.outline / 2, ry: h / 2 - bubble.outline / 2 };
  const variant = TEXT_VARIANT[size];

  const renderContent = (color: string, hidden: boolean) => {
    if (children === undefined || children === null) return null;
    const node =
      typeof children === 'function' ? (
        children(color)
      ) : typeof children === 'string' || typeof children === 'number' ? (
        <AppText variant={variant} weight="semibold" tint={color} align="center" maxFontSizeMultiplier={1.3}>
          {children}
        </AppText>
      ) : (
        children
      );
    return (
      <ContentLayer content={content} hidden={hidden}>
        {node}
      </ContentLayer>
    );
  };

  const toneLayer = (t: BubbleTone) => {
    const tc = toneColors(theme, t);
    return (
      <>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={tc.fill} />
        </Svg>
        {renderContent(tc.ink, true)}
      </>
    );
  };

  return (
    <View style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Ellipse {...outline} fill="none" stroke={theme.colors.optik} strokeWidth={bubble.outline} />
      </Svg>
      {renderContent(theme.colors.text, false)}

      {fill !== undefined ? (
        <Animated.View pointerEvents="none" style={[styles.partial, { height: h }, partialStyle]}>
          <View style={{ width: w, height: h }}>
            {toneLayer(toneState.cur)}
            {toneState.from ? (
              <FadeOut key={toneState.n} duration={duration.base}>
                {toneLayer(toneState.from)}
              </FadeOut>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, groupStyle]}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={clipId}>
              <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />
            </ClipPath>
          </Defs>
          <AnimatedPath
            d={toPath(zig)}
            clipPath={`url(#${clipId})`}
            fill="none"
            stroke={colors.fill}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${zigLen} ${zigLen}`}
            animatedProps={zigProps}
          />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, solidStyle]}>
          {toneLayer(toneState.cur)}
          {toneState.from ? (
            <FadeOut key={toneState.n} duration={duration.base}>
              {toneLayer(toneState.from)}
            </FadeOut>
          ) : null}
        </Animated.View>
      </Animated.View>

      {shownVerdict ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, verdictStyle]}>
          <VerdictMark
            key={verdictKey}
            kind={shownVerdict}
            play={playVerdict.current}
            w={w}
            h={h}
            color={
              shownVerdict === 'pen'
                ? theme.colors.danger
                : filled
                  ? colors.ink
                  : shownVerdict === 'check'
                    ? theme.colors.success
                    : theme.colors.textMuted
            }
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** One copy of the bubble's letter/icon, centered; copies on the fill are hidden from a11y. */
function ContentLayer({ content, hidden, children }: { content: SharedValue<number>; hidden: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: content.value }));
  return (
    <Animated.View pointerEvents="none" aria-hidden={hidden || undefined} style={[StyleSheet.absoluteFill, styles.center, style]}>
      {children}
    </Animated.View>
  );
}

/** Mounts opaque and fades out: the outgoing color of a cross-fade. */
function FadeOut({ duration, children }: { duration: number; children: ReactNode }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withTiming(0, { duration, easing: ease('standard'), reduceMotion: ReduceMotion.Never });
  }, [o, duration]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** The verdict stroke, drawn with strokeDashoffset when `play`, else shown whole. */
function VerdictMark({ kind, play, w, h, color }: { kind: BubbleVerdict; play: boolean; w: number; h: number; color: string }) {
  const theme = useTheme();
  const { verdict, duration } = theme.motion;
  const { bubble, system } = theme.layout;
  // The red pen loops outside the bubble, so its canvas is padded.
  const pad = theme.spacing.sm;
  const W = w + pad * 2;
  const H = h + pad * 2;

  let pts: [number, number][];
  let ms: number;
  let width: number;
  if (kind === 'pen') {
    // A hand-drawn loop: 380° clockwise from −30°, widening a little so the ends don't meet.
    const rx = w / 2 + pad / 2;
    const ry = h / 2 + pad / 2;
    const steps = 40;
    pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = ((verdict.penStartDeg + verdict.penSweepDeg * t) * Math.PI) / 180;
      const grow = 1 + 0.08 * t;
      pts.push([W / 2 + rx * grow * Math.cos(a), H / 2 + ry * grow * Math.sin(a)]);
    }
    ms = verdict.penCircle;
    width = system.iconStroke;
  } else if (kind === 'check') {
    pts = [
      [pad + w * 0.3, pad + h * 0.52],
      [pad + w * 0.45, pad + h * 0.72],
      [pad + w * 0.72, pad + h * 0.3],
    ];
    ms = verdict.checkDraw;
    width = Math.max(bubble.outline, (bubble.scribbleStroke * h) / bubble.letter.h);
  } else {
    pts = [
      [pad + w * 0.34, pad + h / 2],
      [pad + w * 0.66, pad + h / 2],
    ];
    ms = duration.fast;
    width = Math.max(bubble.outline, (bubble.scribbleStroke * h) / bubble.letter.h);
  }
  const len = polyLength(pts);
  const p = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (play) p.value = withTiming(1, { duration: ms, easing: ease('pencil') });
  }, [play, ms, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }), [len]);

  return (
    <Svg width={W} height={H} style={{ position: 'absolute', left: -pad, top: -pad }}>
      <AnimatedPath
        d={toPath(pts)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${len} ${len}`}
        animatedProps={props}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  partial: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
});
