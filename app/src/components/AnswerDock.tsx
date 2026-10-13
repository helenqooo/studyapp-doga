import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { ChoiceLabel } from '../api/types';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { elevated, useTheme } from '../theme';
import { AppText } from './AppText';
import { Bubble, type BubbleTone, type BubbleVerdict } from './Bubble';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { FadeText } from './motion/FadeText';
import type { BurstRect } from './motion/InlineBurst';
import { Loader } from './motion/Loader';
import { PressableScale } from './motion/PressableScale';
import { ease, spring } from './motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.dock.inlineMin = 520 (inner dock width from which the letters and the actions share one row)
const DOCK_INLINE_MIN = 520;
// TOKEN-PENDING: motion.verdict.sealScale = 1.06 (the picked bubble breathing while the answer is graded)
const SEAL_SCALE = 1.06;
// TOKEN-PENDING: motion.verdict.burstRectTtl = 5000 (how long after the dock leaves its pick rect still launches a burst, ms)
const PICK_RECT_TTL = 5000;

const native = Platform.OS !== 'web';

/** Whether the dock is wide enough for the letters and the actions on one row. */
const DockInline = createContext(false);

// ---- Where the picked letter is ---------------------------------------------------------
// The verdict's burst launches from the letter she coded when the choices are collapsed
// (the dock is the only answering surface). The dock reports its picked letter here; the
// rect outlives the dock briefly, because the dock swaps to its status row as the verdict shows.

const letterRects: Partial<Record<ChoiceLabel, BurstRect>> = {};
const letterNodes: Partial<Record<ChoiceLabel, View>> = {};
let picked: ChoiceLabel | null = null;
let mountedDocks = 0;
let releasedAt = 0;

/** The dock's picked letter on screen (window coordinates), or null when there is none. */
export function dockPickRect(): BurstRect | null {
  if (!picked) return null;
  if (mountedDocks === 0 && Date.now() - releasedAt > PICK_RECT_TTL) return null;
  return letterRects[picked] ?? null;
}

/** Re-reads the picked letter's rect (the dock can move after the pick: a note appears above it). */
function remeasurePick() {
  const label = picked;
  const node = label ? letterNodes[label] : null;
  node?.measureInWindow((x, y, width, height) => {
    if (width > 0) letterRects[label!] = { x, y, width, height };
  });
}

/**
 * The floating answer dock: the next action is always under the thumb, wherever the page
 * is scrolled (reading a hint, the solution). Give it to `Screen`'s `dock`.
 * `note` is a short line above the controls (an error, what happens next).
 * When it is too narrow for one row, DockLetters takes the first row and the actions wrap
 * under it.
 */
export function AnswerDock({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { tablet } = useWindowLayout();
  const [inline, setInline] = useState(tablet);
  const pad = theme.spacing.sm;
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width - pad * 2 >= DOCK_INLINE_MIN;
    if (next !== inline) setInline(next);
  };
  const settle = spring('settle');
  // Reduce Motion: a short fade (never skipped, so the dock doesn't pop in).
  const entering = reduceMotion
    ? FadeIn.duration(RM_FADE_MS).reduceMotion(ReduceMotion.Never)
    : native
      ? FadeInDown.springify().damping(settle.damping).stiffness(settle.stiffness).mass(settle.mass)
      : FadeIn;
  return (
    <DockInline.Provider value={inline}>
      <Animated.View
        onLayout={onLayout}
        entering={entering}
        layout={native ? LinearTransition.duration(theme.motion.duration.base) : undefined}
        style={[
          elevated(theme, 'floating'),
          {
            width: '100%',
            maxWidth: theme.layout.dock.maxWidth,
            alignSelf: 'center',
            padding: pad,
            gap: theme.spacing.xs,
          },
        ]}
      >
        {note ? <View style={{ paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xs }}>{note}</View> : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: theme.spacing.sm,
            rowGap: theme.spacing.xs,
            minHeight: theme.layout.dock.height - theme.spacing.lg,
          }}
        >
          {children}
        </View>
      </Animated.View>
    </DockInline.Provider>
  );
}

interface LetterProps {
  label: ChoiceLabel;
  filled: boolean;
  tone: BubbleTone;
  verdict?: BubbleVerdict;
  sealing: boolean;
  disabled: boolean;
  a11y: string;
  checked: boolean;
  onPress: () => void;
}

/** One optik bubble: pressing it scribbles it in (Bubble), with the pencil-grain haptic. */
function Letter({ label, filled, tone, verdict, sealing, disabled, a11y, checked, onPress }: LetterProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const box = useRef<View>(null);
  const breath = useSharedValue(0);
  const { letter } = theme.layout.bubble;

  // Breathes while the answer is graded (a loop, so never under Reduce Motion).
  useEffect(() => {
    if (sealing && !reduceMotion) {
      breath.value = withRepeat(withTiming(1, { duration: theme.motion.duration.slow * 2, easing: ease('breath') }), -1, true);
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: theme.motion.duration.fast, reduceMotion: ReduceMotion.Never });
    }
  }, [sealing, reduceMotion, breath, theme.motion.duration]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (SEAL_SCALE - 1) * breath.value }] }));

  const measure = () =>
    box.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) letterRects[label] = { x, y, width, height };
    });
  useEffect(() => {
    const node = box.current;
    if (node) letterNodes[label] = node;
    return () => {
      if (node && letterNodes[label] === node) delete letterNodes[label];
    };
  }, [label]);

  return (
    <PressableScale
      kind="bubble"
      accessibilityRole="radio"
      accessibilityLabel={a11y}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        measure();
        onPress();
      }}
      style={{ minWidth: theme.layout.minTouch, minHeight: theme.layout.minTouch, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View ref={box} collapsable={false} onLayout={measure} style={[{ width: letter.w, height: letter.h }, breathStyle]}>
        <Bubble size="letter" filled={filled} tone={tone} verdict={verdict}>
          {label}
        </Bubble>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * The A–E row of the optik form: pick your answer from anywhere on the page. A pick
 * scribbles its bubble in (grain haptic); picking it again erases it.
 * With a verdict (`correct` / `wrong`, like MathView's ChoiceState) the row turns into the
 * graded form: a check on the right letter, a red-pen loop around a wrong pick.
 */
export function DockLetters({
  labels,
  selected,
  sealing = false,
  disabled = false,
  correct,
  wrong,
  onPick,
}: {
  labels: ChoiceLabel[];
  selected: ChoiceLabel | null;
  sealing?: boolean;
  disabled?: boolean;
  /** The right answer, once graded: its bubble gets a check. */
  correct?: ChoiceLabel | null;
  /** A wrong pick, once graded: the red pen circles it. */
  wrong?: ChoiceLabel | null;
  onPick: (label: ChoiceLabel) => void;
}) {
  const theme = useTheme();
  const inline = useContext(DockInline);
  const graded = !!(correct || wrong);

  useEffect(() => {
    mountedDocks += 1;
    return () => {
      mountedDocks -= 1;
      releasedAt = Date.now();
    };
  }, []);
  useEffect(() => {
    // The pick the burst launches from: the coded letter, or the wrong one that was circled.
    picked = wrong ?? selected ?? correct ?? null;
  }, [selected, wrong, correct]);

  const style: ViewStyle = inline
    ? { flexDirection: 'row', columnGap: theme.spacing.xxs }
    : { flexDirection: 'row', width: '100%', justifyContent: 'space-between' };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Şıklar" style={style}>
      {labels.map((l) => {
        const isCorrect = correct === l;
        const isWrong = wrong === l;
        const mine = graded ? isWrong || (isCorrect && selected === l) : selected === l;
        const a11y = `${l} şıkkı${isCorrect ? ', doğru cevap' : isWrong ? ', senin cevabın, yanlış' : ''}`;
        return (
          <Letter
            key={l}
            label={l}
            filled={mine}
            tone={isCorrect && mine ? 'success' : 'mark'}
            verdict={isCorrect ? 'check' : isWrong ? 'pen' : undefined}
            sealing={sealing && selected === l && !graded}
            disabled={disabled || graded}
            a11y={a11y}
            checked={mine}
            onPress={() => {
              haptics.grain();
              onPick(l);
            }}
          />
        );
      })}
    </View>
  );
}

/** The dock's primary: a graphite (lamp in dark) fill, the rigid "Kodla" haptic. */
function KodlaButton({ ready, loading, disabled, onPress }: { ready: boolean; loading: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const c = theme.colors;
  const live = (ready || loading) && !disabled;
  const bg = live ? c.primary : c.disabledBg;
  const fg = live ? c.onPrimary : c.disabledFg;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const colorStyle = useAnimatedStyle(() => ({ backgroundColor: withTiming(bg, fade) }), [bg, reduceMotion]);
  const shadow = useSharedValue(live ? 1 : 0);
  useEffect(() => {
    shadow.value = withTiming(live ? 1 : 0, fade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  const shadowStyle = useAnimatedStyle(() => ({ opacity: shadow.value }));
  const { system } = theme.layout;
  const enabled = ready && !loading && !disabled;

  return (
    <PressableScale
      kind="button"
      accessibilityRole="button"
      accessibilityLabel="Cevabı kodla (işaretle)"
      accessibilityHint={ready ? undefined : 'Önce bir şık seç.'}
      accessibilityState={{ disabled: !enabled, busy: loading }}
      disabled={!enabled}
      onPress={() => {
        haptics.rigid();
        // The verdict's burst launches from the coded letter: read where it is now.
        remeasurePick();
        onPress();
      }}
      style={[
        {
          flex: 1,
          minHeight: system.minTouch + theme.spacing.sm,
          borderRadius: theme.radius.button,
          borderCurve: 'continuous',
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        colorStyle as unknown as ViewStyle,
      ]}
    >
      {/* The CTA's shadow fades with its fill instead of popping on. */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: theme.radius.button, boxShadow: c.shadow.accent }, shadowStyle]}
      />
      {loading ? (
        <Loader color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="pen-line" size={system.iconSize.sm} color={fg} />
          <FadeText variant="label" weight="semibold" tint={fg} numberOfLines={1} style={{ fontSize: theme.fontSize.md }}>
            Kodla
          </FadeText>
        </View>
      )}
    </PressableScale>
  );
}

/**
 * The dock's actions under the letters: a ghost way out (Bilmiyorum, Boş bırak) and the
 * primary **Kodla**, live once a letter is picked. Put it in the dock right after DockLetters.
 */
export function DockSubmit({
  ready,
  loading = false,
  disabled = false,
  onSubmit,
  secondary,
}: {
  /** A letter is picked. */
  ready: boolean;
  loading?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  /** The ghost action beside Kodla. */
  secondary?: { label: string; icon?: IconName; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <>
      {secondary ? (
        <Button
          label={secondary.label}
          icon={secondary.icon ?? 'circle-question-mark'}
          variant="ghost"
          disabled={loading || disabled}
          onPress={secondary.onPress}
          style={{ paddingHorizontal: theme.spacing.sm }}
        />
      ) : null}
      <KodlaButton ready={ready} loading={loading} disabled={disabled} onPress={onSubmit} />
    </>
  );
}

/** Small dots for steps used (e.g. hints: ●●○). Filling cross-fades. */
export function Pips({ count, filled, color }: { count: number; filled: number; color: string }) {
  const theme = useTheme();
  const size = theme.layout.pip;
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.xs }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <Pip key={i} on={i < filled} color={color} size={size} />
      ))}
    </View>
  );
}

function Pip({ on, color, size }: { on: boolean; color: string; size: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(on ? 1 : 0, {
      duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [on, reduceMotion, fill, theme.motion.duration.base]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const shape = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[shape, { borderWidth: theme.layout.borderWidth, borderColor: color }]}>
      <Animated.View style={[{ position: 'absolute', left: -theme.layout.borderWidth, top: -theme.layout.borderWidth }, shape, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

/** The graded optik row DockStatus can show: her pick and the right letter. */
export interface DockAnswer {
  labels: ChoiceLabel[];
  /** The letter she coded (null: left blank). */
  picked: ChoiceLabel | null;
  /** The right letter, when known. */
  correct: ChoiceLabel | null;
}

/**
 * A short status line inside the dock: a cross-fading title, and the XP on a fosfor chip.
 * With `answer`, the graded optik row comes first and its marks draw in as it appears: a
 * check on the right letter, the red pen's loop around a wrong pick.
 */
export function DockStatus({ title, tone, xp, answer }: { title: string; tone: string; xp?: number | null; answer?: DockAnswer | null }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // The XP carries information: under Reduce Motion it still fades (short, never skipped).
  const xpIn = reduceMotion
    ? FadeIn.duration(RM_FADE_MS).reduceMotion(ReduceMotion.Never)
    : FadeIn.delay(theme.motion.duration.slow * 2).duration(theme.motion.duration.base);
  // Mount with her pick, then grade on the next frame, so the verdict marks draw (Bubble
  // never animates on mount).
  const [graded, setGraded] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGraded(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const wrong = answer && answer.picked && answer.correct && answer.picked !== answer.correct ? answer.picked : null;
  return (
    <>
      {answer && answer.labels.length ? (
        <DockLetters
          labels={answer.labels}
          selected={answer.picked}
          correct={graded ? answer.correct : null}
          wrong={graded ? wrong : null}
          disabled
          onPick={() => {}}
        />
      ) : null}
      <View style={{ flex: 1, paddingHorizontal: theme.spacing.sm, gap: theme.spacing.xs, alignItems: 'flex-start' }}>
        <FadeText weight="semibold" tint={tone} numberOfLines={2}>
          {title}
        </FadeText>
        {xp ? (
          <Animated.View
            entering={xpIn}
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xxs,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.highlight,
            }}
          >
            <AppText variant="label" weight="semibold" tint={theme.colors.highlightInk} tabular>
              +{xp} XP
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}
