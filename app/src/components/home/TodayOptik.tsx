import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useProfile } from '../../api/hooks';
import { highlightKey } from '../../lib/companionPersist';
import { haptics } from '../../lib/haptics';
import { useWindowLayout } from '../../lib/layout';
import { homeLine } from '../../lib/lumiLines';
import { useCompanionStore } from '../../store/companionStore';
import { useTimerStore } from '../../store/timerStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Card } from '../Card';
import { CompanionPerch } from '../companion/Perch';
import { TypedLine, useHeroVoice } from '../companion/voice';
import { Icon } from '../Icon';
import { PressableScale } from '../motion/PressableScale';
import { ease } from '../motion/presets';
import { Note } from '../Note';
import { useHomeDay } from './homeDay';
import type { TodayGoals } from './useTodayGoals';
import { Marked } from './Marked';

// TOKEN-PENDING: layout.goalRow = { height: 52, label: 76, value: 84 } (spec 7.1 goal rows: row height, label and figure columns)
const GOAL_ROW = { height: 52, label: 76, value: 84 } as const;
// TOKEN-PENDING: home.goalBubbles = { reviewCap: 10, focusSteps: 5 } (Tekrar: one per due question, Odak: 5 × 10 min)
const GOAL_BUBBLES = { reviewCap: 10, focusSteps: 5 } as const;
// TOKEN-PENDING: layout.goalCheck = { stroke: 3, points: [[0.06, 0.55], [0.2, 0.9], [0.94, 0.08]] } (the graphite check across the goals)
const CHECK = { stroke: 3, points: [[0.06, 0.55], [0.2, 0.9], [0.94, 0.08]] as [number, number][] };

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A strip of row bubbles: `filled` whole ones, then one partly filled (0..1), the rest empty. */
function BubbleStrip({ count, filled, partial = 0 }: { count: number; filled: number; partial?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Bubble key={i} size="row" filled={i < filled} fill={i === filled ? partial : 0} />
      ))}
    </View>
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
}

/** One optik row: the goal, where it stands, its bubbles and a quiet verb (52 pt, bubble press). */
function GoalRow({ id, label, value, unit, verb, href, complete, strip }: RowProps) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const key = highlightKey(id);
  const marked = useCompanionStore((s) => s.marked.includes(key));
  // A mark standing when the goal completes gets its strike; the strike stays for this visit.
  const [struck, setStruck] = useState(false);
  if (complete && marked && !struck) setStruck(true);

  const name = (
    <Marked id={id} persistKey={key} done={struck}>
      <AppText variant="heading">{label}</AppText>
    </Marked>
  );
  const figure = (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xxs }}>
      <AppText variant="numeric">{value}</AppText>
      {unit ? (
        <AppText variant="caption" color="textMuted">
          {unit}
        </AppText>
      ) : null}
    </View>
  );
  const chevron = <Icon name="chevron-right" size={theme.layout.system.iconSize.sm} color={theme.colors.primaryText} />;

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
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: GOAL_ROW.height }}
    >
      {tablet ? (
        <>
          <View style={{ width: GOAL_ROW.label }}>{name}</View>
          <View style={{ width: GOAL_ROW.value }}>{figure}</View>
        </>
      ) : (
        // Phone: the goal over its figure, so the bubbles get the width.
        <View style={{ width: GOAL_ROW.label }}>
          {name}
          {figure}
        </View>
      )}
      <View style={{ flex: 1, paddingVertical: theme.spacing.xs }}>{strip}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
        {tablet ? (
          <AppText variant="label" color="primaryText">
            {verb}
          </AppText>
        ) : null}
        {chevron}
      </View>
    </PressableScale>
  );
}

/** The teacher's check across the finished optik: drawn once (420 ms pencil), static after. */
function CheckStroke({ play }: { play: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const draw = useSharedValue(play ? 0 : 1);
  const pts = CHECK.points.map(([x, y]) => [x * box.w, y * box.h] as const);
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
            strokeWidth={CHECK.stroke}
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

/** What Home's note offers to do next, in the order homeLine picks its line. */
function noteAction(o: { phase: string; allDone: boolean; due: number; streak: number; streakToday: boolean; hour: number }): { label: string; href: Href } | undefined {
  if (o.phase !== 'idle') return { label: 'Sayacı aç', href: '/timer' };
  if (o.allDone || o.hour < 5) return undefined;
  if (o.due) return { label: 'Tekrara başla', href: '/review-session' };
  if (o.streak > 0 && !o.streakToday) return { label: 'Sayacı aç', href: '/timer' };
  return undefined;
}

/** Lumi's perch and its note: the companion's current line while it has one, else homeLine. */
function HeroNote({ goals }: { goals: TodayGoals }) {
  const theme = useTheme();
  const profile = useProfile().data;
  const phase = useTimerStore((s) => s.phase);
  const voiced = useHeroVoice();
  const ctx = {
    phase,
    due: goals.review.due,
    streak: profile?.streak ?? 0,
    streakToday: !!profile?.streakToday,
    hour: new Date().getHours(),
    ringsClosed: goals.allDone,
  };
  const line = homeLine(ctx);
  const own = noteAction({ ...ctx, due: ctx.due ?? 0, allDone: goals.allDone });

  const note = voiced ? (
    <Note
      title={voiced.title}
      action={
        voiced.action
          ? {
              label: voiced.action.label,
              onPress: () => {
                const a = voiced.action!;
                a.onPress?.();
                if (a.href) router.push(a.href);
                useCompanionStore.getState().dismiss();
              },
            }
          : undefined
      }
    >
      <TypedLine text={voiced.text} variant="note" tint={theme.colors.noteInk} />
    </Note>
  ) : (
    <Note title={line.title} action={own ? { label: own.label, onPress: () => router.push(own.href) } : undefined}>
      {line.body}
    </Note>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
      <CompanionPerch id="home-note" fallbackMood={voiced?.mood ?? line.mood} />
      <View style={{ flex: 1 }}>{note}</View>
    </View>
  );
}

/**
 * "Bugünün optiği": Lumi's note over three optik rows (Tekrar, Odak, Soru). When all three
 * fill, a graphite check draws across them, with two soft haptics and `goals.allDone`, once
 * a day per user.
 */
export function TodayOptik({ goals, style }: { goals: TodayGoals; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const memo = useHomeDay();
  const { review, focus, solve } = goals;

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

  const reviewCount = Math.min(GOAL_BUBBLES.reviewCap, review.goal);
  const reviewFilled = review.goal ? Math.round((review.value / review.goal) * reviewCount) : 0;
  const step = focus.goal / GOAL_BUBBLES.focusSteps;
  const focusWhole = Math.min(GOAL_BUBBLES.focusSteps, Math.floor(focus.value / step));
  const focusPart = focusWhole < GOAL_BUBBLES.focusSteps ? (focus.value - focusWhole * step) / step : 0;
  const dash = '–';

  return (
    <Card variant="hero" style={style} accessibilityLabel="Bugünün optiği">
      <HeroNote goals={goals} />
      {/* When the row stretches the hero (landscape), the rows sit centred in the slack. */}
      <View style={{ flexGrow: 1, justifyContent: 'center' }}>
        <View>
          <GoalRow
            id="home.tekrar"
            label="Tekrar"
            value={goals.loaded && review.goal ? `${review.value}/${review.goal}` : dash}
            verb={review.due ? 'Başla' : 'Liste'}
            href={review.due ? '/review-session' : '/review'}
            complete={review.complete}
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
          <GoalRow
            id="home.odak"
            label="Odak"
            value={goals.loaded ? `${Math.floor(focus.value)}/${focus.goal}` : dash}
            unit="dk"
            verb="Sayaç"
            href="/timer"
            complete={focus.complete}
            strip={<BubbleStrip count={GOAL_BUBBLES.focusSteps} filled={focusWhole} partial={focusPart} />}
          />
          <GoalRow
            id="home.solve"
            label="Soru"
            value={goals.loaded ? `${Math.min(solve.value, solve.goal)}/${solve.goal}` : dash}
            verb="Çöz"
            href="/camera"
            complete={solve.complete}
            strip={<BubbleStrip count={solve.goal} filled={Math.min(solve.value, solve.goal)} />}
          />
          {showCheck ? <CheckStroke play={celebrate} /> : null}
        </View>
      </View>
    </Card>
  );
}
