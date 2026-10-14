import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeOut,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useProfile } from '../../api/hooks';
import { emptyMemory, highlightKey, loadMemory, rollDay, saveMemory, type CompanionMemory } from '../../lib/companionPersist';
import {
  canFly,
  canSpeakUnsolicited,
  dayOf,
  freshToday,
  holdMs,
  isCompanionRoute,
  isQuietHours,
  isSnoozed,
  isTabRoute,
  nextMidnight,
} from '../../lib/companionRules';
import { haptics } from '../../lib/haptics';
import { eventLineId, lineDef, pickUnsolicited, resolveLine, TAP_TIPS, type AnswerTally, type LineRun } from '../../lib/lumiLines';
import { useCompanionContext, type ContextMemory } from '../../lib/useCompanionContext';
import { useAuthStore } from '../../store/authStore';
import { useCompanionStore, type CompanionEvent, type CompanionLine, type Phase, type Rect } from '../../store/companionStore';
import { usePrefsStore } from '../../store/prefsStore';
import { useTimerStore } from '../../store/timerStore';
import { useTheme } from '../../theme';
import { Mascot, type Held, type MascotMood } from '../mascot/Mascot';
import { LIGHT } from '../mascot/parts';
import { ease, spring } from '../motion/presets';
import { stripGeometry } from '../TabBar';
import { CompanionNote, type NotePlacement } from './CompanionNote';
import { arcLift, arcPoint, bankDeg, flightMs, type Pt } from './flight';
import { Trail, type FlightValues } from './Trail';

// TOKEN-PENDING: motion.companion.routeSettleMs = 220 (perches register before Lumi hops after a route change)
const ROUTE_SETTLE_MS = 220;
// TOKEN-PENDING: motion.companion.liveLingerMs = 2000 (LiveMascot swaps back to Still this long after landing at the nest)
const LIVE_LINGER_MS = 2000;
// TOKEN-PENDING: motion.companion.gazeResetMs = 600 (eyes back to open after scrolling stops)
const GAZE_RESET_MS = 600;
// TOKEN-PENDING: motion.companion.longPressMs = 400 (long-press Lumi: snooze.ask)
const LONG_PRESS_MS = 400;
// TOKEN-PENDING: motion.companion.tickMs = 500 (how often the unsolicited-line scheduler looks)
const TICK_MS = 500;
// TOKEN-PENDING: motion.companion.haloBreathMs = 2400 (the nest's breathing halo round the tip light)
const HALO_BREATH_MS = 2400;
// TOKEN-PENDING: motion.companion.slideOutMs = 220 (dragged away: Lumi slides off)
const SLIDE_OUT_MS = 220;
// TOKEN-PENDING: layout.companion.drag = { slop: 6, awayVy: 0.8, awayVx: 0.8, edge: 32 } (drag-away thresholds)
const DRAG = { slop: 6, awayVy: 0.8, awayVx: 0.8, edge: 32 };
// TOKEN-PENDING: layout.companion.land = { y: 0.82, x: 1.1 } (landing squash, spring land back to 1)
const LAND = { y: 0.82, x: 1.1 };
// TOKEN-PENDING: layout.companion.glideAt = { x: 0.3, y: 0.75 } (glide start/end, × size before the target)
const GLIDE_AT = { x: 0.3, y: 0.75 };
// TOKEN-PENDING: layout.companion.noteOverlap = 0.15 (the note's corner tucks under Lumi's feet, × size)
const NOTE_OVERLAP = 0.15;
// TOKEN-PENDING: layout.companion.noteRoom = 160 (room a note needs below Lumi before it goes above)
const NOTE_ROOM = 160;
// TOKEN-PENDING: layout.companion.hopFar = 120 (a landing farther than this flies instead of hopping)
const HOP_FAR = 120;
// TOKEN-PENDING: layout.companion.routeHopLift = 0.5 (route hops and returns fly a flatter arc)
const SHORT_ARC = 0.5;
// TOKEN-PENDING: opacity.companionHalo = { low: 0.35, high: 1 } (the breathing halo round the tip light)
const HALO = { low: 0.35, high: 1, scale: 1.25 };
// TOKEN-PENDING: layout.companion.haloDot = 0.125 (the breathing tip-light halo's radius, × size)
const HALO_DOT = 0.125;
/** Lumi's drawing grid (parts.tsx viewBox). */
const GRID = 200;
// TOKEN-PENDING: motion.companion.scrollDismiss = 24 (a scroll this far closes the note)
const SCROLL_DISMISS = 24;
/** Staging Lumi for level-ups. Off until the celebration overlay can draw it above its scrim (RewardBurst draws its own). */
const STAGING_ENABLED = false;

/** The perch Lumi rests on per route (the dev route has its own, to try hops and scroll-outs). */
const PERCH_BY_ROUTE: Record<string, string> = { '/': 'home-note', '/timer': 'timer-ring', '/dev-lumi': 'dev-perch' };

const PERCHES = Object.values(PERCH_BY_ROUTE);

type Spot = { id: string; x: number; y: number; anchor: { scrollAt: number } | null };
type TravelKind = 'flight' | 'hop' | 'route' | 'return' | 'glide';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Lumi, the companion (design spec 6): one Lumi that lives in its nest beside the optik strip,
 * hops to perches (the Home note, the timer ring), flies banked arcs with a five-dot tip-light
 * trail to highlight the one thing that matters, and speaks in a sticky note. Mounted once in
 * the root layout; screens only register perches and targets, emit events and say lines.
 */
export function CompanionHost() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const talk = usePrefsStore((s) => s.talk);
  const timerPhase = useTimerStore((s) => s.phase);
  const profile = useProfile().data;
  const readCtx = useCompanionContext();

  const yieldCount = useCompanionStore((s) => s.yieldCount);
  const celebrating = useCompanionStore((s) => s.celebrating);
  const current = useCompanionStore((s) => s.current);
  const perches = useCompanionStore((s) => s.perches);
  const targets = useCompanionStore((s) => s.targets);
  const stripRect = useCompanionStore((s) => s.stripRect);
  const activeScroll = useCompanionStore((s) => s.activeScroll);
  const stageTarget = useCompanionStore((s) => s.stageTarget);
  const draggedAway = useCompanionStore((s) => s.draggedAway);
  const heroVoice = useCompanionStore((s) => s.heroVoice);
  const snoozedUntil = useCompanionStore((s) => s.snoozedUntil);
  const glide = useCompanionStore((s) => s.glide);
  const memoryNonce = useCompanionStore((s) => s.memoryNonce);

  const cfg = theme.motion.companion;
  const lay = theme.layout.companion;
  const tb = theme.layout.tabBar;
  const tablet = W >= theme.breakpoints.window.tablet;
  const size = tablet ? lay.size.tablet : lay.size.compact;
  const hit = tablet ? lay.hit.tablet : lay.hit.compact;

  // ---- Memory (per account) ------------------------------------------------------------
  const mem = useRef<CompanionMemory>(emptyMemory());
  const ctxMem = useRef<ContextMemory>({ firstOpenToday: false, lastActiveAt: 0, firstRun: false });
  const [ready, setReady] = useState(false);
  const save = useCallback(() => {
    if (userId) saveMemory(userId, mem.current);
  }, [userId]);

  useEffect(() => {
    // A new account never sees the previous one's lines, marks or snooze.
    useCompanionStore.setState({ current: null, queue: [], marked: [], snoozedUntil: 0, draggedAway: false, highlightId: null, lastEvent: null });
    mem.current = emptyMemory();
    setReady(false);
    if (!userId) return;
    let alive = true;
    loadMemory(userId).then((m) => {
      if (!alive) return;
      const now = Date.now();
      ctxMem.current = {
        firstOpenToday: !m.lastActiveAt || dayOf(m.lastActiveAt) !== dayOf(now),
        lastActiveAt: m.lastActiveAt,
        firstRun: !m.firstRunDone,
      };
      mem.current = { ...m, lastActiveAt: now };
      saveMemory(userId, mem.current);
      useCompanionStore.setState({ marked: m.marked, snoozedUntil: m.snoozedUntil });
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [userId, memoryNonce]);

  // Marks and the snooze persist with the memory.
  useEffect(
    () =>
      useCompanionStore.subscribe((s, prev) => {
        if (s.marked === prev.marked && s.snoozedUntil === prev.snoozedUntil) return;
        mem.current = { ...mem.current, marked: s.marked, snoozedUntil: s.snoozedUntil };
        save();
      }),
    [save],
  );

  // App state: blink timers stop in the background; coming back counts as a visit.
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const now = Date.now();
      if (state === 'active') {
        const last = mem.current.lastActiveAt;
        ctxMem.current = { ...ctxMem.current, firstOpenToday: !last || dayOf(last) !== dayOf(now), lastActiveAt: last };
        mem.current = { ...rollDay(mem.current, now), lastActiveAt: now };
        save();
        setAppActive(true);
      } else if (state === 'background') {
        mem.current = { ...mem.current, lastActiveAt: now };
        save();
        setAppActive(false);
      }
    });
    return () => sub.remove();
  }, [save]);

  // ---- Keyboard ------------------------------------------------------------------------
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, () => setKeyboard(true));
    const b = Keyboard.addListener(hide, () => setKeyboard(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  // ---- Visibility ----------------------------------------------------------------------
  const allowed = isCompanionRoute(pathname, __DEV__);
  const staged = !!stageTarget;
  const yielding = yieldCount > 0;
  const hidden = !ready || !allowed || yielding || (celebrating && !staged) || keyboard || draggedAway;
  const snoozed = snoozedUntil > Date.now();
  const tab = isTabRoute(pathname);

  useEffect(() => {
    const can = STAGING_ENABLED && !hidden && !reduceMotion;
    if (useCompanionStore.getState().canStage !== can) useCompanionStore.setState({ canStage: can });
  }, [hidden, reduceMotion]);

  // ---- Geometry ------------------------------------------------------------------------
  const geo = stripGeometry(theme, W, insets.bottom);
  const stripTop = stripRect && tab ? stripRect.y : H - geo.bottom - geo.height;
  const nest: Spot = useMemo(() => {
    if (tab) {
      const bottomEdge = stripRect ? stripRect.y + stripRect.h : H - geo.bottom;
      const stripRight = stripRect ? stripRect.x + stripRect.w : geo.left + geo.width;
      const x = geo.tablet ? stripRight + tb.nestGap.tablet : W - tb.sideInset.compact - size;
      return { id: 'nest', x, y: bottomEdge - size, anchor: null };
    }
    const margin = theme.layout.grid[W >= theme.breakpoints.window.landscape ? 'wide' : tablet ? 'regular' : 'compact'].margin;
    return { id: 'nest', x: W - margin - size, y: H - insets.bottom - tb.bottomGap - size, anchor: null };
  }, [tab, stripRect, geo.bottom, geo.left, geo.width, geo.tablet, H, W, size, tablet, insets.bottom, tb, theme]);

  const spotFromRect = useCallback(
    (id: string, r: Rect): Spot => ({
      id,
      x: r.x + (r.w - size) / 2,
      y: r.y + r.h - size,
      anchor: r.anchored ? { scrollAt: r.scrollAt } : null,
    }),
    [size],
  );

  const perchId = PERCH_BY_ROUTE[pathname] ?? null;
  const perchRect = perchId ? perches[perchId] : undefined;
  const perchSpot = useMemo(() => (perchId && perchRect ? spotFromRect(perchId, perchRect) : null), [perchId, perchRect, spotFromRect]);

  // The perch may scroll out of view: Lumi then waits at the nest and returns when it shows.
  const [perchInView, setPerchInView] = useState(true);
  const perchBase = perchSpot?.y ?? 0;
  const perchAt = perchSpot?.anchor?.scrollAt ?? 0;
  const perchAnchored = !!perchSpot?.anchor;
  const viewTop = insets.top;
  const viewBottom = tab ? stripTop : H;
  useAnimatedReaction(
    () => {
      if (!perchAnchored || !activeScroll) return true;
      const y = perchBase - (activeScroll.value - perchAt);
      return y > viewTop - size / 2 && y + size < viewBottom;
    },
    (inView, prev) => {
      if (inView !== prev) runOnJS(setPerchInView)(inView);
    },
    [activeScroll, perchBase, perchAt, perchAnchored, viewTop, viewBottom, size],
  );

  const restKey = perchSpot && perchInView ? perchSpot.id : 'nest';
  const [restId, setRestId] = useState(restKey);
  useEffect(() => {
    if (restKey === restId) return;
    const t = setTimeout(() => setRestId(restKey), ROUTE_SETTLE_MS);
    return () => clearTimeout(t);
  }, [restKey, restId]);
  const rest: Spot = restId !== 'nest' && perchSpot && perchSpot.id === restId ? perchSpot : nest;
  /** Where Lumi belongs right now, without the settle delay (a line is said from here). */
  const restNow: Spot = restKey !== 'nest' && perchSpot ? perchSpot : nest;

  // The perch is Lumi's while the companion is around (so the perch draws no stand-in).
  useEffect(() => {
    const occupied = ready && allowed && !yielding && !(celebrating && !staged) && perchId && perchRect ? perchId : null;
    if (useCompanionStore.getState().occupiedPerch !== occupied) useCompanionStore.setState({ occupiedPerch: occupied });
  }, [ready, allowed, yielding, celebrating, staged, perchId, perchRect]);

  // ---- Motion values -------------------------------------------------------------------
  const p = useSharedValue(1);
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const trail = useSharedValue(0);
  const flip = useSharedValue(0);
  const flight: FlightValues = { p, fx, fy, tx, ty, lift, trail, flip };
  const arcOn = useSharedValue(0);
  const gliding = useSharedValue(0);
  const anchorOn = useSharedValue(0);
  const anchorBase = useSharedValue(0);
  const anchorAt = useSharedValue(0);
  const crouch = useSharedValue(0);
  const land = useSharedValue(0);
  const fade = useSharedValue(1);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const halo = useSharedValue(0);

  // An anchored destination (a perch or a target in the scroll) follows the scroll.
  useAnimatedReaction(
    () => (activeScroll ? activeScroll.value : 0),
    (sy) => {
      if (anchorOn.value) ty.value = anchorBase.value - (sy - anchorAt.value);
    },
    [activeScroll],
  );
  // While gliding, the flight's progress is the highlighter's.
  useAnimatedReaction(
    () => (gliding.value ? p.value : -1),
    (v) => {
      if (v >= 0) glide.value = v;
    },
    [glide],
  );

  const { bankMaxDeg, bobAmp } = lay;
  const takeoffScale = cfg.takeoffScale;
  const posStyle = useAnimatedStyle(() => {
    const pt = arcPoint(p.value, fx.value, fy.value, tx.value, ty.value, lift.value);
    const bob = arcOn.value ? Math.sin(2 * Math.PI * 3 * p.value) * bobAmp : 0;
    return { transform: [{ translateX: pt.x + dragX.value }, { translateY: pt.y + bob + dragY.value }] };
  });
  const bodyStyle = useAnimatedStyle(() => {
    const bank = arcOn.value ? bankDeg(p.value, fx.value, fy.value, tx.value, ty.value, lift.value, bankMaxDeg) : 0;
    const sy = (1 - (1 - takeoffScale) * crouch.value) * (1 - (1 - LAND.y) * land.value);
    const sx = 1 + (LAND.x - 1) * land.value;
    // Squash around the feet: a translate sandwich (iOS ignores transformOrigin here).
    return {
      opacity: fade.value,
      transform: [{ rotate: `${bank}deg` }, { translateY: size / 2 }, { scaleX: sx }, { scaleY: sy }, { translateY: -size / 2 }],
    };
  });
  const haloStyle = useAnimatedStyle(() => ({
    opacity: HALO.low + (HALO.high - HALO.low) * halo.value,
    transform: [{ scale: 1 + (HALO.scale - 1) * halo.value }],
  }));

  const scrollNow = useCallback(() => (useCompanionStore.getState().activeScroll?.value ?? 0), []);
  const spotY = useCallback((s: Spot) => (s.anchor ? s.y - (scrollNow() - s.anchor.scrollAt) : s.y), [scrollNow]);
  const here = useCallback((): Pt => arcPoint(p.value, fx.value, fy.value, tx.value, ty.value, lift.value), [p, fx, fy, tx, ty, lift]);

  const anchorTo = useCallback(
    (s: Spot) => {
      if (s.anchor) {
        anchorBase.value = s.y;
        anchorAt.value = s.anchor.scrollAt;
        anchorOn.value = 1;
      } else anchorOn.value = 0;
    },
    [anchorBase, anchorAt, anchorOn],
  );

  /** Puts Lumi on a spot at once. */
  const place = useCallback(
    (s: Spot) => {
      anchorOn.value = 0;
      const y = spotY(s);
      fx.value = s.x;
      fy.value = y;
      tx.value = s.x;
      ty.value = y;
      lift.value = 0;
      p.value = 1;
      arcOn.value = 0;
      anchorTo(s);
    },
    [anchorOn, spotY, fx, fy, tx, ty, lift, p, arcOn, anchorTo],
  );

  // ---- Presentation state --------------------------------------------------------------
  const [busy, setBusy] = useState(false);
  const [atSpot, setAtSpot] = useState<string | null>(null);
  const [travelMood, setTravelMood] = useState<MascotMood | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const [linger, setLinger] = useState(false);
  const [gaze, setGaze] = useState<'up' | 'down' | null>(null);
  const [blink, setBlink] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [noteAt, setNoteAt] = useState<Pt | null>(null);
  // A tap asks the line effect to look again (a line that waited while Lumi was away).
  const [nudge, setNudge] = useState(0);
  const speakingRef = useRef<string | null>(null);
  speakingRef.current = speaking;
  const atSpotRef = useRef<string | null>(null);
  atSpotRef.current = atSpot;
  // Home's hero note re-types the line only once Lumi says it (voice.tsx useHeroVoice).
  useEffect(() => {
    if (useCompanionStore.getState().speakingId !== speaking) useCompanionStore.setState({ speakingId: speaking });
  }, [speaking]);

  const setPhase = useCallback((phase: Phase) => {
    if (useCompanionStore.getState().phase !== phase) useCompanionStore.setState({ phase });
  }, []);

  // Scripts (flights, missions) run one at a time; a newer one cancels the older.
  const gen = useRef(0);
  /** The line the line effect has taken on (flying to it or saying it). */
  const handled = useRef<string | null>(null);
  const run = useCallback(async (script: (alive: () => boolean) => Promise<void>) => {
    const mine = ++gen.current;
    const alive = () => gen.current === mine;
    setBusy(true);
    try {
      await script(alive);
    } finally {
      if (alive()) setBusy(false);
    }
  }, []);

  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleLive = useCallback(() => {
    setLinger(true);
    if (lingerTimer.current) clearTimeout(lingerTimer.current);
    lingerTimer.current = setTimeout(() => setLinger(false), LIVE_LINGER_MS);
  }, []);
  useEffect(() => () => {
    if (lingerTimer.current) clearTimeout(lingerTimer.current);
  }, []);

  /** Flies (or under Reduce Motion fades) from where Lumi is to a spot. */
  const travel = useCallback(
    async (to: Spot, kind: TravelKind, alive: () => boolean, carry: Held | null = null): Promise<boolean> => {
      const from = here();
      const toY = spotY(to);
      if (reduceMotion) {
        fade.value = withTiming(0, { duration: cfg.rmFadeMs, reduceMotion: ReduceMotion.Never });
        await wait(cfg.rmFadeMs);
        if (!alive()) return false;
        place(to);
        fade.value = withTiming(1, { duration: cfg.rmFadeMs, reduceMotion: ReduceMotion.Never });
        await wait(cfg.rmFadeMs);
        return alive();
      }
      const dx = to.x - from.x;
      const left = dx < -1;
      setFacing(left ? 'left' : 'right');
      flip.value = left ? 1 : 0;
      setTravelMood('fly');
      setHeld(carry);
      if (kind !== 'glide') {
        setPhase('takeoff');
        crouch.value = withSequence(
          withTiming(1, { duration: cfg.takeoffMs, easing: ease('standard') }),
          withTiming(0, { duration: cfg.takeoffMs, easing: ease('standard') }),
        );
        await wait(cfg.takeoffMs);
        if (!alive()) return false;
      }
      anchorOn.value = 0;
      fx.value = from.x;
      fy.value = from.y;
      tx.value = to.x;
      ty.value = toY;
      anchorTo(to);
      const dest = { x: to.x, y: toY };
      const arc = arcLift(from, dest, lay.arcLift, lay.arcLiftMax);
      lift.value = kind === 'glide' ? 0 : kind === 'hop' ? lay.hop : kind === 'route' || kind === 'return' ? arc * SHORT_ARC : arc;
      const ms =
        kind === 'glide' ? cfg.glideMs : kind === 'hop' || kind === 'route' ? cfg.homeHopMs : kind === 'return' ? cfg.returnMs : flightMs(from, dest, cfg);
      arcOn.value = kind === 'glide' ? 0 : 1;
      trail.value = kind === 'glide' || kind === 'hop' ? trail.value : 1;
      p.value = 0;
      p.value = withTiming(1, { duration: ms, easing: ease(kind === 'glide' ? 'highlighter' : 'flight') });
      setPhase(kind === 'glide' ? 'gliding' : kind === 'return' ? 'returning' : 'flying');
      await wait(ms);
      if (!alive()) return false;
      arcOn.value = 0;
      if (kind !== 'glide') {
        trail.value = withTiming(0, { duration: cfg.trailFadeMs });
        land.value = 1;
        land.value = withSpring(0, spring('land'));
      }
      return true;
    },
    [here, spotY, reduceMotion, fade, cfg, place, flip, setPhase, crouch, anchorOn, fx, fy, tx, ty, anchorTo, lay, lift, arcOn, trail, p, land],
  );

  /** Touches down on a spot: Lumi takes the line's mood (or its resting one). */
  const arrive = useCallback(
    (s: Spot) => {
      setAtSpot(s.id);
      setTravelMood(null);
      setHeld(null);
      setFacing('right');
      flip.value = 0;
      setPhase(s.id === 'nest' ? (useCompanionStore.getState().snoozedUntil > Date.now() ? 'sleeping' : 'nest') : 'perched');
      if (s.id === 'nest') settleLive();
    },
    [flip, setPhase, settleLive],
  );

  // Latest values for scripts and callbacks.
  const latest = useRef({ rest, restNow, targets, perches, talk, reduceMotion, hidden, size });
  latest.current = { rest, restNow, targets, perches, talk, reduceMotion, hidden, size };

  // ---- Showing and settling ------------------------------------------------------------
  // Becoming visible (or a rotation) places Lumi at its resting spot without a flight.
  const wasHidden = useRef(true);
  useEffect(() => {
    if (hidden) {
      wasHidden.current = true;
      gen.current++;
      // A line already said is done (it was seen); one Lumi was still flying to is said again later.
      const st = useCompanionStore.getState();
      if (st.current && speakingRef.current === st.current.id) st.dismiss();
      handled.current = null;
      setSpeaking(null);
      if (st.highlightId) useCompanionStore.setState({ highlightId: null });
      setBusy(false);
      setTravelMood(null);
      setHeld(null);
      setAtSpot(null);
      setPhase('hidden');
      return;
    }
    if (!wasHidden.current) return;
    wasHidden.current = false;
    place(rest);
    arrive(rest);
    fade.value = 0;
    fade.value = withTiming(1, { duration: cfg.rmFadeMs, reduceMotion: ReduceMotion.Never });
    // `rest` is read fresh at the moment Lumi shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  useEffect(() => {
    if (hidden || busy || atSpot !== rest.id) return;
    place(rest);
    // Rotation, split view or a re-measured perch: follow without a flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, rest.x, rest.y, rest.anchor?.scrollAt]);

  const lineShown = !!current && speaking === current.id;

  // Settle: with nothing to say, Lumi goes to its resting spot (a route hop or a return).
  useEffect(() => {
    if (hidden || busy || staged) return;
    if (lineShown) return;
    // Not placed yet (Lumi is just showing; `place` + `arrive` put it at its resting spot).
    if (atSpot === null || atSpot === rest.id) return;
    const kind: TravelKind = atSpot === 'nest' || (atSpot !== null && PERCHES.includes(atSpot)) ? 'route' : 'return';
    run(async (alive) => {
      if (kind === 'return') {
        await wait(cfg.notePeelMs);
        if (!alive()) return;
      }
      const to = latest.current.rest;
      if (!(await travel(to, kind, alive))) return;
      arrive(to);
    });
  }, [hidden, busy, staged, lineShown, atSpot, rest.id, run, travel, arrive, cfg.notePeelMs]);

  // Staging for a celebration (when enabled): fly to the centre in the celebrate mood.
  useEffect(() => {
    if (!stageTarget || hidden) return;
    run(async (alive) => {
      const s = latest.current.size;
      const to: Spot = { id: 'stage', x: stageTarget.x - s / 2, y: stageTarget.y - s / 2, anchor: null };
      if (!(await travel(to, 'flight', alive))) return;
      setAtSpot('stage');
      setTravelMood('celebrate');
    });
  }, [stageTarget, hidden, run, travel]);

  // ---- Lines ---------------------------------------------------------------------------
  useEffect(() => {
    if (!current) {
      handled.current = null;
      setSpeaking(null);
      return;
    }
    if (hidden || busy) return;
    if (current.expiresAt && current.expiresAt < Date.now()) {
      useCompanionStore.getState().dismiss();
      return;
    }
    if (handled.current === current.id) return;
    handled.current = current.id;
    const line = current;
    const { targets: tg, talk: tk, reduceMotion: rm } = latest.current;
    const target = line.target ? tg[line.target] : undefined;
    if (line.target && target && canFly(tk, rm) && line.source === 'system') {
      // "Lumi işaretliyor": fly to the line, glide along it with the marker, land, then speak.
      run(async (alive) => {
        const s = latest.current.size;
        const startY = target.y - GLIDE_AT.y * s;
        const anchor = target.anchored ? { scrollAt: target.scrollAt } : null;
        const start: Spot = { id: 'mission', x: target.x - GLIDE_AT.x * s, y: startY, anchor };
        const end: Spot = { id: 'mission', x: target.x + target.w - GLIDE_AT.x * s, y: startY, anchor };
        if (!(await travel(start, 'flight', alive, 'marker'))) return;
        glide.value = 0;
        gliding.value = 1;
        useCompanionStore.setState({ highlightId: line.target! });
        const ok = await travel(end, 'glide', alive, 'marker');
        gliding.value = 0;
        if (!ok) return;
        useCompanionStore.getState().mark(highlightKey(line.target!));
        useCompanionStore.setState({ highlightId: null });
        mem.current = { ...mem.current, signatureDay: dayOf(Date.now()) };
        const { perches: pr, restNow: r } = latest.current;
        const landing = line.perch && pr[line.perch] ? spotFromRect(line.perch, pr[line.perch]!) : r;
        const far = Math.hypot(landing.x - end.x, spotY(landing) - spotY(end)) > HOP_FAR;
        if (!(await travel(landing, far ? 'flight' : 'hop', alive))) return;
        arrive(landing);
        setNoteAt({ x: landing.x, y: spotY(landing) });
        setSpeaking(line.id);
      });
      return;
    }
    // Without a flight: a mark that should stand still appears (Reduce Motion fades it in).
    if (line.target && target && line.source === 'system') {
      useCompanionStore.getState().mark(highlightKey(line.target));
      mem.current = { ...mem.current, signatureDay: dayOf(Date.now()) };
    }
    // Lumi says it from where it lives here (the Home note, the timer ring): if it is not there
    // yet (the hop was still to come), it hops first, so the words never come from across the screen.
    if (atSpotRef.current !== null && atSpotRef.current !== latest.current.restNow.id) {
      run(async (alive) => {
        const to = latest.current.restNow;
        if (!(await travel(to, 'route', alive))) return;
        arrive(to);
        setNoteAt({ x: to.x, y: spotY(to) });
        setSpeaking(line.id);
      });
      return;
    }
    setNoteAt(here());
    setSpeaking(line.id);
  }, [current, hidden, busy, nudge, run, travel, arrive, glide, gliding, spotFromRect, spotY, here]);

  // A line on screen: count it, time it, and let a scroll close it.
  const hold = useRef<{ pause: () => void; resume: () => void } | null>(null);
  const dismissLine = useCallback(() => {
    useCompanionStore.getState().dismiss();
  }, []);
  /** Counts a line in today's ledger (once per line shown). */
  const count = (line: CompanionLine, now: number) => {
    const m = rollDay(mem.current, now);
    const shownIds = m.shownIds.includes(line.id) ? m.shownIds : [...m.shownIds, line.id];
    const system = line.source === 'system';
    mem.current = {
      ...m,
      shownIds,
      unsolicitedToday: m.unsolicitedToday + (system ? 1 : 0),
      lastAt: system ? now : m.lastAt,
      firstRunDone: m.firstRunDone || line.id === 'return.firstRun',
      tipsShown: line.id.startsWith('tip.') && !m.tipsShown.includes(line.id) ? [...m.tipsShown, line.id] : m.tipsShown,
    };
    if (line.id === 'return.firstRun') ctxMem.current = { ...ctxMem.current, firstRun: false };
    save();
  };
  const counted = useRef<CompanionLine | null>(null);
  useEffect(() => {
    if (!lineShown || !current || hidden) return;
    const now = Date.now();
    if (counted.current !== current) {
      counted.current = current;
      count(current, now);
    }
    let remaining = holdMs(current.text, cfg);
    let started = Date.now();
    let t = setTimeout(dismissLine, remaining);
    hold.current = {
      pause: () => {
        clearTimeout(t);
        remaining = Math.max(cfg.rmFadeMs, remaining - (Date.now() - started));
      },
      resume: () => {
        clearTimeout(t);
        started = Date.now();
        t = setTimeout(dismissLine, remaining);
      },
    };
    return () => clearTimeout(t);
    // One run per line shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineShown, current?.id, hidden]);

  // ---- Actions -------------------------------------------------------------------------
  const runAction = useCallback(
    (r: LineRun): (() => void) | undefined => {
      switch (r) {
        case 'startBreak':
          return () => {
            const t = useTimerStore.getState();
            if (t.phase === 'idle') t.start('break', profile?.settings.breakMinutes ?? 5, null);
            if (pathname !== '/timer') router.push('/timer');
          };
        case 'startFocus':
          return () => {
            const t = useTimerStore.getState();
            if (t.phase === 'idle') t.start('focus', profile?.settings.focusMinutes ?? 25, t.subject);
            if (pathname !== '/timer') router.push('/timer');
          };
        case 'resumeTimer':
          return () => {
            useTimerStore.getState().resume();
          };
        default:
          return undefined;
      }
    },
    [profile?.settings.breakMinutes, profile?.settings.focusMinutes, pathname],
  );

  const onAction = useCallback((line: CompanionLine) => {
    line.action?.onPress?.();
    if (line.action?.href) router.push(line.action.href);
    useCompanionStore.getState().dismiss();
  }, []);

  /** Shows a line now (a tap's answer), keeping whatever was waiting. */
  const speakNow = useCallback((line: CompanionLine) => {
    const st = useCompanionStore.getState();
    const queue = st.current && st.current.id !== line.id ? [st.current, ...st.queue] : st.queue;
    handled.current = null;
    useCompanionStore.setState({ current: line, queue: queue.filter((l) => l.id !== line.id) });
  }, []);

  const snoozeNow = useCallback(() => {
    const now = Date.now();
    useCompanionStore.getState().snooze(nextMidnight(now));
    const def = lineDef('snooze.ok');
    if (def) speakNow(resolveLine(def, readCtx(now, ctxMem.current), 'user', runAction));
    setPhase('sleeping');
  }, [readCtx, runAction, speakNow, setPhase]);

  // ---- Events --------------------------------------------------------------------------
  const tally = useRef<AnswerTally>({ correctRun: 0, wrong: 0, wrongShown: false, firstToday: true });
  const onEvent = useRef<(e: CompanionEvent) => void>(() => {});
  onEvent.current = (e) => {
    const now = Date.now();
    const t = tally.current;
    if (e.type === 'answer.verdict') {
      t.correctRun = e.result === 'correct' ? t.correctRun + 1 : 0;
      if (e.result === 'wrong') t.wrong += 1;
    }
    const picked = eventLineId(e, t);
    if (!picked) return;
    const def = lineDef(picked.id);
    if (!def) return;
    mem.current = rollDay(mem.current, now);
    if (!freshToday(mem.current, def.id, def.repeats)) return;
    if (picked.id === 'solve.wrong') t.wrongShown = true;
    const ctx = readCtx(now, ctxMem.current);
    const line = resolveLine(def, ctx, 'user', runAction, picked.text?.(ctx));
    const st = useCompanionStore.getState();
    // One after-solving line waits at a time: a newer verdict replaces an unshown one.
    if (def.id.startsWith('solve.')) {
      const queue = st.queue.filter((l) => !l.id.startsWith('solve.'));
      const replaceCurrent = st.current?.id.startsWith('solve.') && speaking !== st.current.id;
      useCompanionStore.setState({ queue, current: replaceCurrent ? null : st.current });
    }
    useCompanionStore.getState().say(line);
  };

  const onReact = useRef<(m: MascotMood) => void>(() => {});
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  onReact.current = (mood) => {
    setReaction(mood);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => {
      setReaction(null);
      useCompanionStore.setState({ reaction: null });
      if (atSpot === 'nest') settleLive();
    }, theme.motion.mascot.reactionMs);
  };
  useEffect(() => () => {
    if (reactTimer.current) clearTimeout(reactTimer.current);
  }, []);

  useEffect(
    () =>
      useCompanionStore.subscribe((s, prev) => {
        if (s.lastEvent && s.lastEvent !== prev.lastEvent) onEvent.current(s.lastEvent);
        if (s.reaction && s.reaction !== prev.reaction) onReact.current(s.reaction);
      }),
    [],
  );

  // ---- Unsolicited lines (caps, quiet hours, dwell: companionRules) --------------------
  const enteredAt = useRef(Date.now());
  const lastTouchAt = useRef(0);
  const spokeThisVisit = useRef(false);
  useEffect(() => {
    enteredAt.current = Date.now();
    spokeThisVisit.current = false;
  }, [pathname]);

  useEffect(() => {
    if (hidden || !appActive) return;
    const id = setInterval(() => {
      const st = useCompanionStore.getState();
      if (st.current || gen.current < 0) return;
      const now = Date.now();
      mem.current = rollDay(mem.current, now);
      const m = mem.current;
      const today = dayOf(now);
      const timer = useTimerStore.getState();
      const ctx = readCtx(now, ctxMem.current);
      const homeFirst = pathname === '/' && m.signatureDay !== today && ctxMem.current.firstOpenToday;
      const intro = pathname === '/' && !m.firstRunDone;
      const moment = {
        now,
        talk: intro ? ('often' as const) : talk,
        pathname,
        enteredAt: enteredAt.current,
        lastTouchAt: lastTouchAt.current,
        spokeThisVisit: spokeThisVisit.current,
        focusRunning: timer.phase === 'focus',
        keyboard,
        celebrating,
        visible: !hidden,
      };
      const ledger = { shownIds: m.shownIds, unsolicitedToday: intro ? 0 : m.unsolicitedToday, lastAt: intro ? 0 : m.lastAt, snoozedUntil: st.snoozedUntil };
      const verdict = canSpeakUnsolicited(ledger, moment, { dwellMs: homeFirst || intro ? cfg.firstLineDelayMs + theme.motion.focusPull.ms : undefined });
      if (!verdict.ok) return;
      const def = pickUnsolicited(ctx, (d) => freshToday(m, d.id, d.repeats));
      if (!def) return;
      spokeThisVisit.current = true;
      const line = resolveLine(def, ctx, 'system', runAction);
      // The day's signature flight plays once; a second signature line just speaks.
      if (def.signature && def.id !== 'idle.countdown' && m.signatureDay === today) line.target = undefined;
      st.say(line);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [hidden, appActive, pathname, talk, keyboard, celebrating, readCtx, runAction, cfg.firstLineDelayMs, theme.motion.focusPull.ms]);

  // ---- Eyes follow the scroll (8.4) and a note closes on a scroll ----------------------
  const gazeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteScroll = useRef<number | null>(null);
  useEffect(() => {
    noteScroll.current = lineShown ? scrollNow() : null;
  }, [lineShown, scrollNow]);
  const onScroll = useCallback(
    (dir: number, y: number) => {
      lastTouchAt.current = Date.now();
      setGaze(dir > 0 ? 'down' : 'up');
      if (gazeTimer.current) clearTimeout(gazeTimer.current);
      gazeTimer.current = setTimeout(() => setGaze(null), GAZE_RESET_MS);
      const start = noteScroll.current;
      if (start !== null && Math.abs(y - start) > SCROLL_DISMISS && !latest.current.hidden) {
        noteScroll.current = null;
        useCompanionStore.getState().dismiss();
      }
    },
    [],
  );
  useEffect(() => () => {
    if (gazeTimer.current) clearTimeout(gazeTimer.current);
  }, []);
  const lastDir = useSharedValue(0);
  const lastPing = useSharedValue(0);
  useAnimatedReaction(
    () => (activeScroll ? activeScroll.value : 0),
    (y, prev) => {
      if (prev === null || y === prev) return;
      const dir = y > prev ? 1 : -1;
      const now = Date.now();
      if (dir !== lastDir.value || now - lastPing.value > GAZE_RESET_MS / 4) {
        lastDir.value = dir;
        lastPing.value = now;
        runOnJS(onScroll)(dir, y);
      }
    },
    [activeScroll, onScroll],
  );

  // ---- Nest life: a blink every few seconds and the breathing halo ---------------------
  const live = busy || !!reaction || linger || staged || (atSpot !== null && atSpot !== 'nest');
  const atNest = atSpot === 'nest' && !busy;
  useEffect(() => {
    if (hidden || !appActive || live) return;
    let t: ReturnType<typeof setTimeout>;
    const [lo, hi] = cfg.nestBlink;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          loop();
        }, theme.motion.mascot.blinkMs);
      }, lo + Math.random() * (hi - lo));
    };
    loop();
    return () => clearTimeout(t);
  }, [hidden, appActive, live, cfg.nestBlink, theme.motion.mascot.blinkMs]);

  useEffect(() => {
    if (reduceMotion || hidden || !atNest || !appActive) {
      halo.value = 0;
      return;
    }
    halo.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: HALO_BREATH_MS, easing: ease('breath') }));
    const id = setInterval(() => {
      halo.value = withTiming(halo.value > 0.5 ? 0 : 1, { duration: HALO_BREATH_MS, easing: ease('breath') });
    }, HALO_BREATH_MS);
    return () => clearInterval(id);
  }, [reduceMotion, hidden, atNest, appActive, halo]);

  // ---- Taps, long-press and drag -------------------------------------------------------
  const mood: MascotMood = useMemo(() => {
    if (reaction) return reaction;
    if (travelMood) return travelMood;
    if (lineShown && current) return current.mood;
    if (snoozed) return 'sleepy';
    if (timerPhase === 'focus') return atSpot === 'timer-ring' ? 'focus' : 'sleepy';
    if (timerPhase === 'break' && atSpot === 'timer-ring') return 'break';
    return 'idle';
  }, [reaction, travelMood, lineShown, current, snoozed, timerPhase, atSpot]);

  const onTap = useCallback(() => {
    haptics.tap();
    const st = useCompanionStore.getState();
    // A second tap while a note is open: ask Lumi properly.
    if (st.current && speaking === st.current.id) {
      st.dismiss();
      router.push('/assistant');
      return;
    }
    const sleeping = isSnoozed({ snoozedUntil: st.snoozedUntil }, Date.now());
    const focus = useTimerStore.getState().phase === 'focus';
    onReact.current(mood === 'sad' ? 'love' : sleeping ? 'surprised' : focus ? 'wink' : Math.random() < 0.5 ? 'happy' : 'wink');
    if (busy) return;
    if (st.current || st.queue.length) {
      // The highest pending line (one that waited while Lumi was away is taken up again).
      if (!st.current) st.dismiss();
      handled.current = null;
      setNudge((n) => n + 1);
      return;
    }
    const now = Date.now();
    mem.current = rollDay(mem.current, now);
    const m = mem.current;
    const id = sleeping
      ? 'tap.sleeping'
      : focus
        ? 'timer.tap'
        : isQuietHours(now)
          ? 'tod.night'
          : mood === 'sad'
            ? 'tap.sad'
            : (TAP_TIPS.find((tip) => freshToday(m, tip)) ?? 'tap.default');
    const def = lineDef(id);
    if (def) speakNow(resolveLine(def, readCtx(now, ctxMem.current), 'user', runAction));
  }, [speaking, mood, busy, readCtx, runAction, speakNow]);

  const onLongPress = useCallback(() => {
    haptics.press();
    const def = lineDef('snooze.ask');
    if (def) speakNow(resolveLine(def, readCtx(Date.now(), ctxMem.current), 'user', runAction));
  }, [readCtx, runAction, speakNow]);

  const slideAway = useCallback(
    (vx: number, vy: number) => {
      const across = Math.abs(vx) > Math.abs(vy);
      const out = { duration: SLIDE_OUT_MS, easing: ease('exit') };
      if (across) dragX.value = withTiming(Math.sign(vx || 1) * W, out);
      else dragY.value = withTiming(H, out);
      setTimeout(() => {
        dragX.value = 0;
        dragY.value = 0;
        useCompanionStore.setState({ draggedAway: true });
      }, SLIDE_OUT_MS);
    },
    [dragX, dragY, W, H],
  );

  const gesture = useRef({ onTap, onLongPress, slideAway, W });
  gesture.current = { onTap, onLongPress, slideAway, W };
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; long: boolean; moved: boolean }>({ timer: null, long: false, moved: false });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > DRAG.slop || Math.abs(g.dy) > DRAG.slop,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const pr = press.current;
          pr.long = false;
          pr.moved = false;
          if (pr.timer) clearTimeout(pr.timer);
          pr.timer = setTimeout(() => {
            pr.long = true;
            gesture.current.onLongPress();
          }, LONG_PRESS_MS);
        },
        onPanResponderMove: (_, g) => {
          const pr = press.current;
          if (!pr.moved && Math.hypot(g.dx, g.dy) > DRAG.slop) {
            pr.moved = true;
            if (pr.timer) clearTimeout(pr.timer);
          }
          if (pr.moved && !pr.long) {
            dragX.value = g.dx;
            dragY.value = g.dy;
          }
        },
        onPanResponderRelease: (_, g) => {
          const pr = press.current;
          if (pr.timer) clearTimeout(pr.timer);
          if (pr.long) return;
          if (!pr.moved) {
            gesture.current.onTap();
            return;
          }
          const w = gesture.current.W;
          const nearEdge = g.moveX < DRAG.edge || g.moveX > w - DRAG.edge;
          const flung = g.vy > DRAG.awayVy || Math.abs(g.vx) > DRAG.awayVx;
          if (nearEdge || flung) gesture.current.slideAway(g.vx, g.vy);
          else {
            dragX.value = withSpring(0, spring('settle'));
            dragY.value = withSpring(0, spring('settle'));
          }
        },
        onPanResponderTerminate: () => {
          const pr = press.current;
          if (pr.timer) clearTimeout(pr.timer);
          dragX.value = withSpring(0, spring('settle'));
          dragY.value = withSpring(0, spring('settle'));
        },
      }),
    [dragX, dragY],
  );

  // ---- Note placement ------------------------------------------------------------------
  const timerOn = timerPhase !== 'idle';
  const placement: NotePlacement = useMemo(() => {
    const margin = theme.layout.grid[tablet ? 'regular' : 'compact'].margin;
    const maxWidth = Math.min(tablet ? lay.noteMaxWidth.tablet : lay.noteMaxWidth.compact, W - 2 * margin);
    // noteAt is set before every line shows; the fallback skips the scroll (no shared-value read in render).
    const at = noteAt ?? { x: rest.x, y: rest.y };
    const floor = tab ? stripTop - (timerOn ? tb.ear.height + tb.ear.gap : 0) : H - insets.bottom;
    const rightSide = at.x + size / 2 > W / 2;
    const horizontal = rightSide
      ? { right: Math.max(margin, W - (at.x + size * (1 - NOTE_OVERLAP))) }
      : { left: Math.max(margin, at.x + size * NOTE_OVERLAP) };
    const below = at.y + size + NOTE_ROOM < floor;
    // Lumi stands on the note's top corner; at the nest the note sits above Lumi instead.
    const vertical = below ? { top: at.y + size * (1 - NOTE_OVERLAP) } : { bottom: Math.max(H - at.y + theme.spacing.xs, H - floor + theme.spacing.sm) };
    return { ...horizontal, ...vertical, maxWidth };
  }, [noteAt, rest, size, W, H, tab, stripTop, timerOn, tb.ear, insets.bottom, tablet, lay.noteMaxWidth, theme]);

  const heroSpeaks = pathname === '/' && heroVoice > 0;
  const noteLine = lineShown && !hidden && !heroSpeaks ? current : null;
  const [noteMounted, setNoteMounted] = useState(false);
  useEffect(() => {
    if (noteLine) setNoteMounted(true);
  }, [noteLine]);

  // The trail stays up until its dots have faded after touch-down (no cut at landing).
  const [trailUp, setTrailUp] = useState(false);
  useEffect(() => {
    if (busy) {
      setTrailUp(true);
      return;
    }
    const t = setTimeout(() => setTrailUp(false), cfg.trailFadeMs);
    return () => clearTimeout(t);
  }, [busy, cfg.trailFadeMs]);

  // ---- Render --------------------------------------------------------------------------
  const ember = draggedAway && allowed && ready && !yielding;
  const accessibilityActions = useMemo(() => [{ name: 'activate' as const }, { name: 'longpress' as const }], []);
  const lx = (LIGHT.x / GRID) * size;
  const ly = (LIGHT.y / GRID) * size;
  const haloR = (size * lay.haloScale) / 2;
  const glowR = size * HALO_DOT;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: theme.layout.z.companion }]}>
      {noteMounted ? (
        <CompanionNote
          line={noteLine}
          placement={placement}
          onClose={dismissLine}
          onAction={onAction}
          onSnooze={snoozeNow}
          onHold={(h) => (h ? hold.current?.pause() : hold.current?.resume())}
          onGone={() => setNoteMounted(false)}
        />
      ) : null}

      {!hidden && trailUp && !reduceMotion ? <Trail f={flight} size={size} /> : null}

      {!hidden ? (
        <Animated.View
          exiting={FadeOut.duration(cfg.rmFadeMs).reduceMotion(ReduceMotion.Never)}
          style={[styles.lumi, { width: size, height: size }, posStyle]}
          hitSlop={(hit - size) / 2}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Lumi. Dokun: konuş. Basılı tut: bugün sessiz."
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'longpress' ? onLongPress() : onTap())}
          {...pan.panHandlers}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bodyStyle]}>
            {theme.scheme === 'dark' ? (
              <Svg
                pointerEvents="none"
                width={haloR * 2}
                height={haloR * 2}
                style={{ position: 'absolute', left: size / 2 - haloR, top: size / 2 - haloR }}
              >
                <Defs>
                  <RadialGradient id="lumiHalo" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={theme.colors.mascot.glowSoft} stopOpacity={1} />
                    <Stop offset="1" stopColor={theme.colors.mascot.glowSoft} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={haloR} cy={haloR} r={haloR} fill="url(#lumiHalo)" />
              </Svg>
            ) : null}
            {atNest && !reduceMotion ? (
              <Animated.View
                style={[
                  styles.halo,
                  {
                    left: (facing === 'left' ? size - lx : lx) - glowR,
                    top: ly - glowR,
                    width: glowR * 2,
                    height: glowR * 2,
                    borderRadius: glowR,
                    backgroundColor: theme.colors.mascot.glowSoft,
                  },
                  haloStyle,
                ]}
              />
            ) : null}
            <Mascot
              mood={mood}
              size={size}
              still={!live}
              interactive={false}
              enter={false}
              facing={facing}
              held={held ?? (travelMood ? null : undefined)}
              lookAt={atNest && tab && pathname !== '/profile' ? -1 : 0}
              gaze={atNest ? gaze : null}
              blink={atNest && blink}
            />
          </Animated.View>
        </Animated.View>
      ) : null}

      {ember ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lumi'yi geri çağır"
          onPress={() => useCompanionStore.setState({ draggedAway: false })}
          style={[
            styles.ember,
            {
              left: nest.x + size / 2 - theme.layout.system.minTouch / 2,
              top: nest.y + size - theme.layout.system.minTouch,
              width: theme.layout.system.minTouch,
              height: theme.layout.system.minTouch,
            },
          ]}
        >
          <View
            style={{
              width: lay.ember,
              height: lay.ember,
              borderRadius: lay.ember / 2,
              backgroundColor: theme.colors.mascot.glow,
              boxShadow: `0px 0px ${lay.ember}px ${theme.colors.mascot.glowSoft}`,
            }}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lumi: { position: 'absolute', left: 0, top: 0 },
  halo: { position: 'absolute' },
  ember: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
});
