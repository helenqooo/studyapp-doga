import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useProfile } from '../../api/hooks';
import { highlightKey } from '../../lib/companionPersist';
import { haptics } from '../../lib/haptics';
import { useContentSize, useWindowLayout } from '../../lib/layout';
import { homeLine } from '../../lib/lumiLines';
import { useCompanionStore } from '../../store/companionStore';
import { useTimerStore } from '../../store/timerStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Button } from '../Button';
import { Card } from '../Card';
import { CompanionPerch } from '../companion/Perch';
import { TypedLine, useHeroVoice } from '../companion/voice';
import { Icon } from '../Icon';
import { FadeText } from '../motion/FadeText';
import { PressableScale } from '../motion/PressableScale';
import { ease } from '../motion/presets';
import { useHomeDay } from './homeDay';
import type { TodayGoals } from './useTodayGoals';
import { Highlight } from '../Highlight';


const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A strip of goal bubbles: `filled` whole ones, then one partly filled (0..1), the rest empty. */
function BubbleStrip({ count, filled, partial = 0 }: { count: number; filled: number; partial?: number }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tablet ? theme.spacing.sm : theme.spacing.xs }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Bubble key={i} size={tablet ? 'letter' : 'row'} filled={i < filled} fill={i === filled ? partial : 0} />
      ))}
    </View>
  );
}

/**
 * The row's verb as a pill (the whole row is the press target): soft, or filled like a primary
 * button on the row that holds Lumi's next step. The fill and the label cross-fade.
 */
function ActionPill({ label, lead }: { label: string; lead: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { touch } = useWindowLayout();
  const c = theme.colors;
  const bg = lead ? c.primary : c.primarySoft;
  const fade = { duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const fill = useAnimatedStyle(() => ({ backgroundColor: withTiming(bg, fade) }), [bg, reduceMotion]);
  return (
    <Animated.View
      style={[
        {
          width: theme.layout.goalRow.action,
          minHeight: touch,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.button,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
        },
        fill,
      ]}
    >
      <FadeText variant="label" weight="semibold" tint={lead ? c.onPrimary : c.primaryText} numberOfLines={1}>
        {label}
      </FadeText>
    </Animated.View>
  );
}

interface RowProps {
  id: string;
  label: string;
  value: string;
  unit?: string;
  verb: string;
  href: Href;
  /** Marked by Lumi today and now complete: the graphite strike runs through the label. */
  complete: boolean;
  strip: ReactNode;
  /** How the row is set: the goal and its figure in columns or stacked, and a pill or a chevron at the end. */
  fit: HeroFit;
  /** The figure column's least width, shared by the rows so their bubbles start together. */
  figureWidth: number;
  /** Reports the figure's own width, so the rows can widen their figure columns together. */
  onFigureWidth: (id: string, width: number) => void;
  /** Lumi's next step is this row's: its pill is filled. */
  lead: boolean;
}

/** The hero's room (tablet only): the action as a pill, and the goal and its figure in separate columns. */
interface HeroFit {
  pill: boolean;
  columns: boolean;
}

/** One optik row: the goal, where it stands in Lora, its bubbles and its verb (bubble press). */
function GoalRow({ id, label, value, unit, verb, href, complete, strip, fit, figureWidth, onFigureWidth, lead }: RowProps) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const key = highlightKey(id);
  const marked = useCompanionStore((s) => s.marked.includes(key));
  // A mark standing when the goal completes gets its strike; the strike stays for this visit.
  const [struck, setStruck] = useState(false);
  if (complete && marked && !struck) setStruck(true);

  const name = (
    <Highlight id={id} persistKey={key} done={struck}>
      <AppText variant="heading">{label}</AppText>
    </Highlight>
  );
  // The figure keeps its own width (a long one like "12/50 dk" widens every row's column).
  const figure = (
    <View
      onLayout={(e: LayoutChangeEvent) => onFigureWidth(id, Math.ceil(e.nativeEvent.layout.width))}
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}
    >
      <AppText variant="stat">{value}</AppText>
      {unit ? (
        <AppText variant="label" color="textMuted">
          {unit}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <PressableScale
      kind="bubble"
      scaleTo={theme.motion.press.card}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}. ${verb}`}
      onPress={() => {
        haptics.grain();
        router.push(href);
      }}
      style={{
        flexGrow: 1,
        // A stretched hero spreads its rows, but only so far (a 13" iPad would leave them sparse).
        maxHeight: tablet && fit.columns ? Math.round(theme.layout.group.rowMinHeight.tablet * theme.layout.goalRow.maxShare) : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        gap: fit.pill ? theme.spacing.lg : tablet ? theme.spacing.md : theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {fit.columns ? (
        <>
          <View style={{ width: theme.layout.goalRow.label }}>{name}</View>
          <View style={{ minWidth: figureWidth, flexShrink: 0 }}>{figure}</View>
        </>
      ) : (
        // Narrow: the goal over its figure, so the bubbles get the width.
        <View style={{ minWidth: figureWidth, flexShrink: 0 }}>
          {name}
          {figure}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>{strip}</View>
      {fit.pill ? <ActionPill label={verb} lead={lead} /> : <Icon name="chevron-right" size={theme.layout.system.iconSize.sm} color={theme.colors.primaryText} />}
    </PressableScale>
  );
}

/** The optik's printed rule between rows. */
function Rule() {
  const theme = useTheme();
  return <View style={{ height: theme.layout.borderWidth, backgroundColor: theme.colors.optikSoft }} />;
}

/** The teacher's check across the finished optik: drawn once (420 ms pencil), static after. */
function CheckStroke({ play }: { play: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const draw = useSharedValue(play ? 0 : 1);
  const pts = theme.layout.goalCheck.points.map(([x, y]) => [x * box.w, y * box.h] as const);
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);

  useEffect(() => {
    if (!play || box.w === 0) return;
    draw.value = 0;
    draw.value = reduceMotion
      ? withTiming(1, { duration: theme.motion.companion.rmFadeMs, reduceMotion: ReduceMotion.Never })
      : withTiming(1, { duration: theme.motion.duration.page, easing: ease('pencil') });
  }, [play, box.w, reduceMotion, draw, theme.motion]);

  const props = useAnimatedProps(
    () => (reduceMotion ? { strokeDashoffset: 0, strokeOpacity: draw.value } : { strokeDashoffset: length * (1 - draw.value), strokeOpacity: 1 }),
    [length, reduceMotion],
  );
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.round(width) !== box.w || Math.round(height) !== box.h) setBox({ w: Math.round(width), h: Math.round(height) });
  };
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <View pointerEvents="none" aria-hidden onLayout={onLayout} style={StyleSheet.absoluteFill}>
      {box.w > 0 ? (
        <Svg width={box.w} height={box.h}>
          <AnimatedPath
            d={d}
            stroke={theme.colors.mark}
            strokeWidth={theme.layout.goalCheck.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            animatedProps={props}
          />
        </Svg>
      ) : null}
    </View>
  );
}

interface Words {
  title?: string;
  text: string;
  /** The companion's live line re-types itself; the hero's own line just shows. */
  typed: boolean;
  action?: { label: string; onPress: () => void };
}

/**
 * Lumi's words in a speech bubble on note paper, its tail pointing at the perch; set in Lora,
 * Lumi's voice. With room the action sits at the bubble's right, else under the words.
 */
function SpeechBubble({ words, wide }: { words: Words; wide: boolean }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const ink = theme.colors.noteInk;
  const tail = theme.layout.bubbleTail;
  // A line with a title reads title + body; a bare line is set at the title's size. Lora's
  // tabular figures widen its spaces, so Lumi's sentences keep proportional ones.
  const bodyVariant = words.title ? 'body' : 'heading';
  const body = words.typed ? (
    <TypedLine text={words.text} variant={bodyVariant} family="serif" weight="regular" tabular={false} tint={ink} />
  ) : (
    <AppText variant={bodyVariant} family="serif" weight="regular" tabular={false} tint={ink}>
      {words.text}
    </AppText>
  );
  const action = words.action ? (
    <Button label={words.action.label} size="sm" onPress={words.action.onPress} style={{ alignSelf: wide ? 'center' : 'flex-start' }} />
  ) : null;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'stretch',
        gap: wide ? theme.spacing.lg : theme.spacing.md,
        paddingVertical: tablet ? theme.spacing.lg : theme.spacing.md,
        paddingHorizontal: tablet ? theme.spacing.xl : theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.colors.bubble,
      }}
    >
      {/* The tail: a small diamond of the same paper, pointing back at Lumi. */}
      <View
        aria-hidden
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -tail / 2 + theme.layout.borderWidth,
          top: '50%',
          marginTop: -tail / 2,
          width: tail,
          height: tail,
          borderRadius: theme.radius.xs / 2,
          backgroundColor: theme.colors.bubble,
          transform: [{ rotate: theme.layout.bubbleTailTurn }],
        }}
      />
      <View style={{ flex: wide ? 1 : undefined, gap: theme.spacing.xs }}>
        {words.title ? (
          <AppText variant="heading" family="serif" weight="semibold" tabular={false} tint={ink}>
            {words.title}
          </AppText>
        ) : null}
        {body}
      </View>
      {action}
    </View>
  );
}

/** A step Home's note offers, and the goal row it leads to. */
interface NoteStep {
  label: string;
  href: Href;
  row: 'home.tekrar' | 'home.odak';
}

/** What Home's note offers to do next, in the order homeLine picks its line. */
function noteAction(o: { phase: string; allDone: boolean; due: number; streak: number; streakToday: boolean; hour: number }): NoteStep | undefined {
  if (o.phase !== 'idle') return { label: 'Sayacı aç', href: '/timer', row: 'home.odak' };
  if (o.allDone || o.hour < 5) return undefined;
  if (o.due) return { label: 'Tekrara başla', href: '/review-session', row: 'home.tekrar' };
  if (o.streak > 0 && !o.streakToday) return { label: 'Sayacı aç', href: '/timer', row: 'home.odak' };
  return undefined;
}

/** Home's line and its next step (the companion's live line aside). */
function useHomeNote(goals: TodayGoals) {
  const profile = useProfile().data;
  const phase = useTimerStore((s) => s.phase);
  const ctx = {
    phase,
    due: goals.review.due,
    streak: profile?.streak ?? 0,
    streakToday: !!profile?.streakToday,
    hour: new Date().getHours(),
    ringsClosed: goals.allDone,
  };
  return { line: homeLine(ctx), step: noteAction({ ...ctx, due: ctx.due ?? 0, allDone: goals.allDone }) };
}

/**
 * Lumi on its perch, saying the companion's current line while it has one, else homeLine.
 * With `rowsLead`, the note's own step is left to its goal row (the filled pill), so the
 * hero shows one next step, not two.
 */
function HeroGreeting({ note, wide, rowsLead }: { note: ReturnType<typeof useHomeNote>; wide: boolean; rowsLead: boolean }) {
  const theme = useTheme();
  const voiced = useHeroVoice();
  const { line, step } = note;
  const own = rowsLead ? undefined : step;

  const words: Words = voiced
    ? {
        title: voiced.title,
        text: voiced.text,
        typed: true,
        action: voiced.action
          ? {
              label: voiced.action.label,
              onPress: () => {
                const a = voiced.action!;
                a.onPress?.();
                if (a.href) router.push(a.href);
                useCompanionStore.getState().dismiss();
              },
            }
          : undefined,
      }
    : {
        title: line.title,
        text: line.body,
        typed: false,
        action: own ? { label: own.label, onPress: () => router.push(own.href) } : undefined,
      };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
      <CompanionPerch id="home-note" fallbackMood={voiced?.mood ?? line.mood} />
      <SpeechBubble words={words} wide={wide} />
    </View>
  );
}

/**
 * "Bugünün optiği": Lumi's words over three optik rows (Tekrar, Odak, Soru). When all three
 * fill, a graphite check draws across them, with two soft haptics and `goals.allDone`, once
 * a day per user.
 */
export function TodayOptik({ goals, style }: { goals: TodayGoals; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const { width } = useContentSize();
  const fit: HeroFit = { pill: tablet && width >= theme.layout.goalRow.pillMin, columns: tablet && width >= theme.layout.goalRow.columnsMin };
  const memo = useHomeDay();
  const note = useHomeNote(goals);
  // With pills, the note's next step fills its row's pill instead of repeating as a button.
  const lead = fit.pill ? note.step?.row : undefined;
  const { review, focus, solve } = goals;

  // The figure columns: their least width, widened together to the widest figure.
  const [figures, setFigures] = useState<Record<string, number>>({});
  const onFigureWidth = useCallback((id: string, w: number) => setFigures((f) => (f[id] === w ? f : { ...f, [id]: w })), []);
  const least = fit.columns ? theme.layout.goalRow.figure : tablet ? theme.layout.goalRow.stacked.tablet : theme.layout.goalRow.stacked.compact;
  const figureWidth = Math.max(least, ...Object.values(figures));
  const rowProps = { fit, figureWidth, onFigureWidth };

  // The day's celebration: decided once the day's memory is read and the goals are in.
  const [celebrate, setCelebrate] = useState(false);
  const fired = useRef(false);
  const second = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { ready, update } = memo;
  const doneToday = memo.allDone;
  useEffect(() => {
    if (!ready || !goals.allDone || doneToday || fired.current) return;
    fired.current = true;
    setCelebrate(true);
    update({ allDone: true });
    haptics.soft();
    second.current = setTimeout(() => haptics.soft(), theme.motion.duration.fast);
    useCompanionStore.getState().emit({ type: 'goals.allDone' });
  }, [ready, doneToday, update, goals.allDone, theme.motion.duration.fast]);
  useEffect(() => () => clearTimeout(second.current), []);
  const showCheck = goals.allDone && (celebrate || (memo.ready && memo.allDone));

  const reviewCount = Math.min(theme.home.goalBubbles.reviewCap, review.goal);
  const reviewFilled = review.goal ? Math.round((review.value / review.goal) * reviewCount) : 0;
  const step = focus.goal / theme.home.goalBubbles.focusSteps;
  const focusWhole = Math.min(theme.home.goalBubbles.focusSteps, Math.floor(focus.value / step));
  const focusPart = focusWhole < theme.home.goalBubbles.focusSteps ? (focus.value - focusWhole * step) / step : 0;
  const dash = '–';
  // Odak past its goal shows the minutes alone ("125 dk"), not "125/50".
  const minutes = Math.floor(focus.value);
  const focusFigure = minutes >= focus.goal ? String(minutes) : `${minutes}/${focus.goal}`;

  return (
    <Card variant="hero" style={[{ gap: 0 }, style]} accessibilityLabel="Bugünün optiği">
      <HeroGreeting note={note} wide={fit.pill} rowsLead={!!lead} />
      {/* The rows share the height the hero is given (iPad: toward the strip), each up to its
          cap; any rest is split above and below them rather than left under the last row. */}
      <View style={{ flexGrow: 1, justifyContent: 'center', marginTop: tablet ? theme.spacing.lg : theme.spacing.md }}>
        <GoalRow
          id="home.tekrar"
          label="Tekrar"
          value={goals.loaded && review.goal ? `${review.value}/${review.goal}` : dash}
          verb={review.due ? 'Başla' : 'Listeyi aç'}
          href={review.due ? '/review-session' : '/review'}
          complete={review.complete}
          lead={lead === 'home.tekrar'}
          {...rowProps}
          strip={
            goals.loaded && !review.goal ? (
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                Bugün tekrar yok
              </AppText>
            ) : (
              <BubbleStrip count={reviewCount} filled={reviewFilled} />
            )
          }
        />
        <Rule />
        <GoalRow
          id="home.odak"
          label="Odak"
          value={goals.loaded ? focusFigure : dash}
          unit="dk"
          verb="Sayacı aç"
          href="/timer"
          complete={focus.complete}
          lead={lead === 'home.odak'}
          {...rowProps}
          strip={<BubbleStrip count={theme.home.goalBubbles.focusSteps} filled={focusWhole} partial={focusPart} />}
        />
        <Rule />
        <GoalRow
          id="home.solve"
          label="Soru"
          value={goals.loaded ? `${Math.min(solve.value, solve.goal)}/${solve.goal}` : dash}
          verb="Soru çöz"
          href="/camera"
          complete={solve.complete}
          lead={false}
          {...rowProps}
          strip={<BubbleStrip count={solve.goal} filled={Math.min(solve.value, solve.goal)} />}
        />
        {showCheck ? <CheckStroke play={celebrate} /> : null}
      </View>
    </Card>
  );
}
