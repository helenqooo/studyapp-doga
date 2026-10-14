import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { useCompanionStore } from '../store/companionStore';
import { useTheme } from '../theme';
import { ease } from './motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion fade for the strike, spec 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.highlight.passShift = 1.5 (how far the second ink pass sits from the first, pt)
const PASS_SHIFT = 1.5;
// TOKEN-PENDING: opacity.highlightPass = 0.85 (each light-mode ink pass, spec 3 Highlight)
const PASS_OPACITY = 0.85;

/** The band's height and its top edge inside a line box of this height (pt). */
function bandRows(lineHeight: number, heightRatio: number) {
  const height = Math.round(lineHeight * heightRatio);
  // Sits slightly below the middle of the line, like a hand-drawn swipe.
  return { height, top: (lineHeight - height) / 2 + PASS_SHIFT };
}

/** A rounded rect with a different radius per corner (tl, tr, br, bl): the uneven marker ends. */
function bandPath(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: readonly number[]) {
  const c = (r: number) => Math.min(r, h / 2, w / 2);
  const [a, b, d, e] = [c(tl), c(tr), c(br), c(bl)];
  return (
    `M${x + a} ${y}H${x + w - b}Q${x + w} ${y} ${x + w} ${y + b}` +
    `V${y + h - d}Q${x + w} ${y + h} ${x + w - d} ${y + h}` +
    `H${x + e}Q${x} ${y + h} ${x} ${y + h - e}` +
    `V${y + a}Q${x} ${y} ${x + a} ${y}Z`
  );
}

interface BandProps {
  /** The text's width and line height (pt); the band adds the lead-in and tail itself. */
  width: number;
  lineHeight: number;
  /** 0..1, drawn left to right by clipping (the ink does not stretch). */
  progress: SharedValue<number>;
  /** Optional overall opacity (Reduce Motion fades instead of drawing). */
  opacity?: SharedValue<number>;
  tone?: string;
}

/**
 * The highlighter swipe alone, positioned behind a line of text whose box starts at 0,0:
 * 0.62 × line height, from 4 pt before to 6 pt after the text, slanted −8°, turned −1°.
 * Light mode lays two translucent passes (the overlap reads as real ink); dark mode one solid
 * pass. Shared by Highlight and the ghost Button's press swipe.
 */
export function HighlightBand({ width, lineHeight, progress, opacity, tone }: BandProps) {
  const theme = useTheme();
  const hl = theme.layout.highlight;
  const color = tone ?? theme.colors.highlight;
  const dark = theme.scheme === 'dark';
  const bandW = width + hl.leadIn + hl.tail;
  const { height: bandH, top: bandTop } = bandRows(lineHeight, hl.heightRatio);
  // Room for the slant and the turn so nothing is clipped at the ends.
  const pad = Math.ceil(bandH * Math.tan((Math.abs(hl.skewDeg) * Math.PI) / 180) + PASS_SHIFT * 2);
  const boxW = bandW + pad * 2;
  const boxH = bandH + pad * 2;
  const top = bandTop - pad;
  const left = -hl.leadIn - pad;
  const passes = dark ? 1 : hl.passes;

  const clipStyle = useAnimatedStyle(() => ({
    // Nothing before the draw starts; then the band's left padding (its slanted start), the
    // drawn share, and the right padding only once complete.
    width: progress.value <= 0 ? 0 : pad + bandW * Math.min(1, progress.value) + (progress.value >= 1 ? pad : 0),
    opacity: opacity ? opacity.value : 1,
  }));

  if (width <= 0 || lineHeight <= 0) return null;
  return (
    <Animated.View pointerEvents="none" aria-hidden style={[{ position: 'absolute', top, left, height: boxH, overflow: 'hidden' }, clipStyle]}>
      <Svg width={boxW} height={boxH}>
        <G transform={`rotate(${hl.rotateDeg} ${boxW / 2} ${boxH / 2}) translate(${pad} ${pad}) skewX(${hl.skewDeg})`}>
          {Array.from({ length: passes }, (_, i) => (
            <Path
              key={i}
              d={bandPath(i * PASS_SHIFT + (bandH / 2) * Math.tan((-hl.skewDeg * Math.PI) / 180), i ? -PASS_SHIFT / 2 : 0, bandW - i * PASS_SHIFT * 2, bandH, i ? [...hl.radii].reverse() : hl.radii)}
              fill={color}
              fillOpacity={dark ? 1 : PASS_OPACITY}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

interface Props {
  /** Registers the text's window rect as a companion target under this id (Lumi can fly here). */
  id?: string;
  /** Drawn by the component itself (420 ms highlighter), e.g. a static mark. */
  drawn?: boolean;
  /** Raw color for the swipe; default `highlight`. */
  tone?: string;
  /** Raw color of the text inside the swipe; default `highlightInk` (pass `text` on a soft subject tint). */
  ink?: string;
  /** Drawn while this key is in `companionStore.marked` (a highlight that stays until done). */
  persistKey?: string;
  /** The task is done: a graphite strike draws through the text and the mark is dropped. */
  done?: boolean;
  /** Registers the text's rect as a perch for Lumi under this id (where Lumi lands after the glide). */
  perch?: string;
  /** Exactly one single-line AppText. */
  children: ReactElement<{ tint?: string; numberOfLines?: number }>;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Lumi işaretliyor": a highlighter swipe behind one line of text. While Lumi glides along
 * it (it is `companionStore.highlightId`), the swipe follows `companionStore.glide`;
 * otherwise it draws on `drawn` (or a persisted mark) by itself. Inside the swipe the text
 * turns `highlightInk` through a clipped copy, so the color flips exactly at the ink's edge.
 */
export function Highlight({ id, drawn = false, tone, ink, persistKey, done = false, perch, children, style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width: winW, height: winH } = useWindowDimensions();
  const ref = useRef<View>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const glide = useCompanionStore((s) => s.glide);
  const active = useCompanionStore((s) => !!id && s.highlightId === id);
  const marked = useCompanionStore((s) => !!persistKey && s.marked.includes(persistKey));
  const shown = drawn || marked || done;

  const own = useSharedValue(shown ? 1 : 0);
  const fade = useSharedValue(1);
  const strike = useSharedValue(done ? 1 : 0);
  const wasActive = useRef(active);

  // The highlighter: own timing on `drawn`, handed over seamlessly when a glide ends.
  useEffect(() => {
    if (wasActive.current && !active) own.value = glide.value;
    wasActive.current = active;
    if (active) return;
    if (reduceMotion) {
      own.value = 1;
      fade.value = withTiming(shown ? 1 : 0, { duration: theme.motion.companion.rmFadeMs, reduceMotion: ReduceMotion.Never });
      return;
    }
    fade.value = 1;
    own.value = shown
      ? withTiming(1, { duration: theme.motion.highlight.draw, easing: ease('highlighter') })
      : withTiming(0, { duration: theme.motion.highlight.retract, easing: ease('standard') });
  }, [active, shown, reduceMotion, glide, own, fade, theme.motion]);

  // Done: the graphite strike, then the persisted mark is dropped.
  useEffect(() => {
    strike.value = done
      ? reduceMotion
        ? withTiming(1, { duration: RM_FADE_MS, reduceMotion: ReduceMotion.Never })
        : withTiming(1, { duration: theme.motion.highlight.strike, easing: ease('pencil') })
      : withTiming(0, { duration: RM_FADE_MS, reduceMotion: ReduceMotion.Never });
    if (done && persistKey) useCompanionStore.getState().markDone(persistKey);
  }, [done, persistKey, reduceMotion, strike, theme.motion.highlight.strike]);

  // The companion target and perch: the text's window rect, re-measured on layout and resize.
  const measure = () => {
    if (!id && !perch) return;
    ref.current?.measureInWindow((x, y, w, h) => {
      if (!w && !h) return;
      const store = useCompanionStore.getState();
      const scroll = store.activeScroll;
      const rect = { x, y, w, h, scrollAt: scroll ? scroll.value : 0, anchored: !!scroll };
      if (id) store.registerTarget(id, rect);
      if (perch) store.registerPerch(perch, rect);
    });
  };
  useEffect(measure, [winW, winH, box.w, box.h]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      const store = useCompanionStore.getState();
      if (id) store.unregisterTarget(id);
      if (perch) store.unregisterPerch(perch);
    },
    [id, perch],
  );

  // One progress for the band and the text flip: the glide while active, else our own.
  const source = active ? glide : own;
  const { leadIn, tail } = theme.layout.highlight;
  const rows = bandRows(box.h, theme.layout.highlight.heightRatio);
  const inkClip = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, source.value));
    // The ink copy ends exactly where the band does.
    return { width: (leadIn + box.w + tail) * p, opacity: fade.value };
  }, [source, box.w, leadIn, tail]);
  const strikeStyle = useAnimatedStyle(() =>
    reduceMotion ? { width: box.w, opacity: strike.value } : { width: box.w * strike.value, opacity: 1 },
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.round(w) !== box.w || Math.round(h) !== box.h) setBox({ w: Math.round(w), h: Math.round(h) });
  };

  const single = { numberOfLines: children.props.numberOfLines ?? 1 };
  return (
    <View ref={ref} onLayout={onLayout} style={[styles.wrap, style]}>
      <HighlightBand width={box.w} lineHeight={box.h} progress={source} opacity={fade} tone={tone} />
      {cloneElement(children, single)}
      {/* The same text in highlightInk, revealed with the ink. */}
      {/* Clipped to the band's rows too: glyph parts outside the ink keep their own color. */}
      <Animated.View pointerEvents="none" aria-hidden style={[styles.ink, { left: -leadIn, top: rows.top, height: rows.height }, inkClip]}>
        <View style={{ width: box.w, height: box.h, marginLeft: leadIn, marginTop: -rows.top }}>
          {cloneElement(children, { ...single, tint: ink ?? theme.colors.highlightInk })}
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        aria-hidden
        style={[
          styles.strike,
          { top: (box.h - theme.layout.highlight.strikeWidth) / 2, height: theme.layout.highlight.strikeWidth, backgroundColor: theme.colors.mark, borderRadius: theme.radius.pill },
          strikeStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  ink: { position: 'absolute', overflow: 'hidden' },
  strike: { position: 'absolute', left: 0 },
});
