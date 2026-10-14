import { router } from 'expo-router';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { haptics } from '../lib/haptics';
import { formatClock, useNow } from '../lib/useNow';
import { useCompanionStore } from '../store/companionStore';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { elevated, useTheme, type Theme } from '../theme';
import { AppText } from './AppText';
import { Bubble } from './Bubble';
import { PressableScale } from './motion/PressableScale';
import { Odometer } from './motion/Odometer';
import { ease, enter, exit, spring } from './motion/presets';

// TOKEN-PENDING: layout.tabBar.ear.ringStroke = 3 (the ear / TimerPill ring's stroke; its head dot has this radius)
const EAR_RING_STROKE = 3;
// TOKEN-PENDING: layout.tabBar.badgeOffset = { x: 10, y: 6 } (badge disc: left = bubbleW - x, top = -y)
const BADGE_OFFSET = { x: 10, y: 6 };
// TOKEN-PENDING: motion.tabs.badgeFrom = 0.6 (the badge pops from this scale)
const BADGE_POP_FROM = 0.6;
// TOKEN-PENDING: opacity.stripFade = { midAt: 0.45, mid: 0.75, end: 0.92 } (the paper fade behind the strip)
const STRIP_FADE = { midAt: 0.45, mid: 0.75, end: 0.92 };
// TOKEN-PENDING: layout.tabBar.compactAfter = 24 (scrolling down past this offset compacts the phone strip)
const COMPACT_AFTER = 24;

/** The strip's geometry for this window (design spec 4.2). */
export function stripGeometry(theme: Theme, windowWidth: number, insetBottom: number) {
  const tb = theme.layout.tabBar;
  const tablet = windowWidth >= theme.breakpoints.window.tablet;
  const height = tablet ? tb.height.tablet : tb.height.compact;
  const bottom = Math.max(insetBottom - tb.insetTrim, tb.bottomGap);
  const lumi = theme.layout.companion.size;
  let left: number;
  let width: number;
  const nest = lumi.tablet + tb.nestGap.tablet;
  const centered = windowWidth - 2 * (tb.sideInset.tablet + nest);
  if (tablet && centered >= tb.centeredMinWidth) {
    // Centered, leaving room on both sides for Lumi's nest to its right.
    width = Math.min(tb.maxWidth, centered);
    left = (windowWidth - width) / 2;
  } else if (tablet) {
    // A narrow tablet window (split view): left-aligned like the phone, so five tabs keep
    // their room; Lumi's nest still sits to its right.
    left = tb.sideInset.tablet;
    width = Math.min(tb.maxWidth, windowWidth - 2 * tb.sideInset.tablet - nest);
  } else {
    // Left-aligned; Lumi's nest slot is on the right.
    left = tb.sideInset.compact;
    width = windowWidth - 2 * tb.sideInset.compact - (lumi.compact + tb.nestGap.compact);
  }
  return { tablet, height, bottom, left, width };
}

/** What the strip occupies at the bottom of a tab scene: Screen pads its content by this. */
export function stripReserve(theme: Theme, windowWidth: number, insetBottom: number, ear = false) {
  const g = stripGeometry(theme, windowWidth, insetBottom);
  const tb = theme.layout.tabBar;
  return g.bottom + g.height + tb.reserveExtra + (ear ? tb.ear.height + tb.ear.gap : 0);
}

/** The running pomodoro: a 28 pt ring (graphite arc, fosfor head dot) and the clock. Shared by the ear and TimerPill. */
export function TimerFace() {
  const theme = useTheme();
  const timer = useTimerStore();
  const running = timer.phase !== 'idle' && timer.endsAt !== null;
  const now = useNow(running);
  const left = remainingMs(timer, now);
  const done = timer.plannedMs > 0 ? Math.min(1, Math.max(0, 1 - left / timer.plannedMs)) : 0;
  const size = theme.layout.tabBar.ear.ring;
  const r = (size - EAR_RING_STROKE * 2) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const angle = 2 * Math.PI * done;
  const arc = timer.phase === 'break' ? theme.colors.successStrong : theme.colors.mark;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={theme.colors.border} strokeWidth={EAR_RING_STROKE} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={arc}
          strokeWidth={EAR_RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - done)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Circle cx={c + r * Math.sin(angle)} cy={c - r * Math.cos(angle)} r={EAR_RING_STROKE} fill={theme.colors.accent} />
      </Svg>
      <AppText variant="numeric" color="text">
        {formatClock(left)}
      </AppText>
    </View>
  );
}

/** The timer ear: a small floating sheet above the strip's top-left while a pomodoro runs. */
function TimerEar({ left, bottom }: { left: number; bottom: number }) {
  const theme = useTheme();
  const timer = useTimerStore();
  const focus = timer.phase === 'focus';
  const ear = theme.layout.tabBar.ear;
  return (
    <Animated.View
      entering={enter({ duration: theme.motion.duration.base })}
      exiting={exit(theme.motion.duration.fast)}
      style={{ position: 'absolute', left, bottom, zIndex: theme.layout.z.ear }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${focus ? 'Odak' : 'Mola'}: ${formatClock(remainingMs(timer, Date.now()))} kaldı. Sayacı aç.`}
        onPress={() => router.push('/timer')}
        style={{
          ...elevated(theme, 'floating'),
          backgroundColor: theme.colors.tabBar,
          height: ear.height,
          minWidth: ear.minWidth,
          paddingHorizontal: theme.spacing.sm,
          justifyContent: 'center',
        }}
      >
        <TimerFace />
      </PressableScale>
    </Animated.View>
  );
}

/** Tekrar's count: a fosfor disc on the bubble's corner that pops in and rolls its digits. */
function TabBadge({ value, bubbleW, tablet }: { value: number | string | undefined; bubbleW: number; tablet: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const tb = theme.layout.tabBar;
  const size = tablet ? tb.badge.tablet : tb.badge.compact;
  const count = typeof value === 'number' ? value : value ? Number(value) || 0 : 0;
  const [shown, setShown] = useState(count);
  const scale = useSharedValue(count > 0 ? 1 : 0);
  const seen = useRef(count);

  useEffect(() => {
    if (count > 0) setShown(count);
    if (seen.current === count) return;
    seen.current = count;
    const never = { reduceMotion: ReduceMotion.Never };
    if (count <= 0) {
      scale.value = withTiming(0, { duration: theme.motion.duration.fast, easing: ease('exit'), ...never });
    } else if (reduceMotion) {
      scale.value = withTiming(1, { duration: theme.motion.duration.instant, ...never });
    } else {
      scale.value = withSequence(withTiming(BADGE_POP_FROM, { duration: 0 }), withSpring(1, spring('bouncy')));
    }
  }, [count, reduceMotion, scale, theme]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: scale.value > 0 ? 1 : 0 }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: bubbleW - BADGE_OFFSET.x,
          top: -BADGE_OFFSET.y,
          minWidth: size + tb.badgeRing * 2,
          height: size + tb.badgeRing * 2,
          paddingHorizontal: theme.spacing.xxs,
          borderRadius: theme.radius.pill,
          borderWidth: tb.badgeRing,
          borderColor: theme.colors.tabBar,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Odometer value={shown} cacheKey="tab-badge" variant="caption" family="display" weight="semibold" tint={theme.colors.highlightInk} />
    </Animated.View>
  );
}

interface ItemProps {
  label: string;
  a11yLabel: string;
  a11yHint?: string;
  focused: boolean;
  badge: number | string | undefined;
  icon: ((color: string, focused: boolean) => ReactNode) | null;
  tablet: boolean;
  /** Least width of the tab: the token, clamped to the strip's share so all tabs fit. */
  minWidth: number;
  compact: SharedValue<number>;
  wiggle: number;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ label, a11yLabel, a11yHint, focused, badge, icon, tablet, minWidth, compact, wiggle, onPress, onLongPress }: ItemProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const tb = theme.layout.tabBar;
  const bubble = tablet ? tb.bubble.tablet : tb.bubble.compact;
  const { duration, tabs } = theme.motion;

  // Label color cross-fades (no hard cut): the active label sits over the inactive one.
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, {
      duration: reduceMotion ? duration.instant : duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [focused, reduceMotion, on, duration]);

  // Re-tapping the active tab: one ±4° wiggle of the bubble.
  const rot = useSharedValue(0);
  const firstWiggle = useRef(wiggle);
  useEffect(() => {
    if (wiggle === firstWiggle.current || reduceMotion) return;
    const step = tabs.wiggleMs / 4;
    rot.value = withSequence(
      withTiming(tabs.wiggleDeg, { duration: step, easing: ease('standard') }),
      withTiming(-tabs.wiggleDeg, { duration: step * 2, easing: ease('standard') }),
      withTiming(0, { duration: step, easing: ease('standard') }),
    );
  }, [wiggle, reduceMotion, rot, tabs]);

  // Compaction (phone): the bubble settles to the middle and shrinks; the label fades and drops.
  const settle = ((tb.compactHeight - bubble.h) / 2 - tb.padY) as number;
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: settle * compact.value },
      { scale: 1 - (1 - theme.motion.press.bubble) * compact.value },
      { rotate: `${rot.value}deg` },
    ],
  }));
  const labelBox = useAnimatedStyle(() => ({
    opacity: 1 - compact.value,
    transform: [{ translateY: tabs.labelDrop * compact.value }],
  }));
  const activeLabel = useAnimatedStyle(() => ({ opacity: on.value }));
  const idleLabel = useAnimatedStyle(() => ({ opacity: 1 - on.value }));

  const iconFor = (color: string) =>
    icon
      ? // The bubble draws its content on the paper (in `text`) and again on the fill (in markInk).
        color === theme.colors.text
        ? icon(theme.colors.tabInactive, false)
        : icon(color, true)
      : null;

  return (
    <PressableScale
      kind="bubble"
      haptic="select"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={tabs.longPress}
      style={{
        flex: 1,
        minWidth,
        alignItems: 'center',
        paddingTop: tb.padY,
        gap: tablet ? tb.labelGap.tablet : tb.labelGap.compact,
      }}
    >
      <Animated.View style={bubbleStyle}>
        <Bubble size="tab" filled={focused} tone="mark">
          {iconFor}
        </Bubble>
        {badge !== undefined ? <TabBadge value={badge} bubbleW={bubble.w} tablet={tablet} /> : null}
      </Animated.View>
      {/* The box spans the whole tab, so neither label is squeezed to the other's measured width. */}
      <Animated.View style={[{ alignSelf: 'stretch' }, labelBox]}>
        {/* The wider semibold label holds the height; the regular one sits over it, centered. */}
        <Animated.View style={activeLabel}>
          <AppText variant="micro" weight="semibold" color="text" align="center" numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {label}
          </AppText>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, idleLabel]}>
          <AppText variant="micro" weight={tablet ? 'semibold' : 'medium'} tint={theme.colors.tabInactive} align="center" numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {label}
          </AppText>
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * The "optik şerit": one floating row of an optik form, five tabs, five bubbles (design spec 4).
 * On a tablet it is 80 pt tall and up to 560 wide, with 64 × 40 bubbles, 24 pt icons and
 * 13 pt semibold labels, centered with Lumi's nest to its right.
 * Rendered by the tabs layout through `tabBar`; scenes run full height underneath and pad
 * themselves by the height this reports.
 */
export function OptikStrip({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const g = stripGeometry(theme, W, insets.bottom || safe.bottom);
  const tb = theme.layout.tabBar;
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const timerOn = useTimerStore((s) => s.phase !== 'idle');
  const fadeId = `stripfade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Report the occupied height so Screen pads content (and the ear) clear of the strip.
  const reserved = g.bottom + g.height + tb.reserveExtra + (timerOn ? tb.ear.height + tb.ear.gap : 0);
  useEffect(() => {
    reportHeight?.(reserved);
  }, [reportHeight, reserved]);

  // Publish the strip's window rect for the companion (Lumi's nest sits beside it).
  const stripRef = useRef<View>(null);
  const measure = () => {
    stripRef.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) return;
      useCompanionStore.getState().setStripRect({ x, y, w, h, scrollAt: 0, anchored: false });
    });
  };
  useEffect(() => {
    // Rotation and split view move the strip without a layout change of its own.
    const t = setTimeout(measure, theme.motion.duration.base);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, g.left, g.width, g.bottom]);
  useEffect(() => () => useCompanionStore.getState().setStripRect(null), []);

  // Keyboard: the strip slides away while it is up.
  const rootH = g.bottom + g.height + Math.max(tb.fadeAbove, tb.ear.height + tb.ear.gap);
  const away = useSharedValue(0);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const timing = { duration: theme.motion.tabs.keyboard, easing: ease('standard') };
    const a = Keyboard.addListener(show, () => (away.value = withTiming(1, timing)));
    const b = Keyboard.addListener(hide, () => (away.value = withTiming(0, timing)));
    return () => {
      a.remove();
      b.remove();
    };
  }, [away, theme.motion.tabs.keyboard]);
  const rootStyle = useAnimatedStyle(() => ({ transform: [{ translateY: away.value * rootH }] }));

  // Scroll compaction (phone only, off under RM), driven by the focused Screen's scroll.
  const activeScroll = useCompanionStore((s) => s.activeScroll);
  const compact = useSharedValue(0);
  const target = useSharedValue(0);
  const canCompact = !g.tablet && !reduceMotion;
  const compactMs = theme.motion.tabs.compact;
  const standard = ease('standard');
  useEffect(() => {
    target.value = 0;
    compact.value = withTiming(0, { duration: compactMs, easing: standard });
  }, [activeScroll, canCompact, compact, target, compactMs, standard]);
  useAnimatedReaction(
    () => (activeScroll ? activeScroll.value : 0),
    (y, prev) => {
      if (!canCompact || prev === null) return;
      let next = target.value;
      if (y <= 0) next = 0;
      else if (y > prev && y > COMPACT_AFTER) next = 1;
      else if (y < prev) next = 0;
      if (next === target.value) return;
      target.value = next;
      compact.value = withTiming(next, { duration: compactMs, easing: standard });
    },
    [activeScroll, canCompact, compactMs, standard],
  );
  const stripStyle = useAnimatedStyle(() => ({ height: g.height - (g.height - tb.compactHeight) * compact.value }));

  // Re-tap wiggles, keyed by route.
  const [wiggles, setWiggles] = useState<Record<string, number>>({});

  const routes = state.routes.filter((route) => {
    const flat = StyleSheet.flatten(descriptors[route.key]?.options.tabBarItemStyle);
    return flat?.display !== 'none';
  });
  // A narrow tablet window (split view, ~560-640 pt) gives the strip less than five full tabs:
  // never ask for more than each tab's share, or the last one is cut off.
  const itemMin = Math.min(g.tablet ? tb.itemMinWidth.tablet : tb.itemMinWidth.compact, Math.floor(g.width / Math.max(1, routes.length)));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: rootH, zIndex: theme.layout.z.strip }, rootStyle]}
    >
      {/* The paper fade: content dissolves under the strip instead of being cut by it. */}
      <Svg pointerEvents="none" width={W} height={g.bottom + g.height + tb.fadeAbove} style={{ position: 'absolute', left: 0, bottom: 0 }}>
        <Defs>
          <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.background} stopOpacity={0} />
            <Stop offset={STRIP_FADE.midAt} stopColor={theme.colors.background} stopOpacity={STRIP_FADE.mid} />
            <Stop offset="1" stopColor={theme.colors.background} stopOpacity={STRIP_FADE.end} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={g.bottom + g.height + tb.fadeAbove} fill={`url(#${fadeId})`} />
      </Svg>

      {timerOn ? <TimerEar left={g.left + theme.spacing.md} bottom={g.bottom + g.height + tb.ear.gap} /> : null}

      <Animated.View
        ref={stripRef}
        onLayout={measure}
        accessibilityRole="tablist"
        style={[
          elevated(theme, 'floating'),
          {
            position: 'absolute',
            left: g.left,
            width: g.width,
            bottom: g.bottom,
            backgroundColor: theme.colors.tabBar,
            flexDirection: 'row',
            alignItems: 'flex-start',
            overflow: 'hidden',
          },
          stripStyle,
        ]}
      >
        {routes.map((route) => {
          const index = state.routes.indexOf(route);
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
          const position = `sekme ${routes.indexOf(route) + 1}/${routes.length}`;
          const renderIcon = options.tabBarIcon;
          const solve = route.name === 'solve';
          return (
            <TabItem
              key={route.key}
              label={label}
              a11yLabel={`${options.tabBarAccessibilityLabel ?? label}, ${position}`}
              a11yHint={solve ? 'Basılı tut: kamerayı aç' : undefined}
              focused={focused}
              badge={options.tabBarBadge}
              icon={renderIcon ? (color, f) => renderIcon({ focused: f, color, size: g.tablet ? tb.icon.tablet : tb.icon.compact }) : null}
              tablet={g.tablet}
              minWidth={itemMin}
              compact={compact}
              wiggle={wiggles[route.key] ?? 0}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (e.defaultPrevented) return;
                if (!focused) {
                  navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
                  return;
                }
                // Re-tap: Çöz opens the camera; elsewhere Screen scrolls to top and the bubble wiggles.
                if (solve) router.push('/camera');
                else setWiggles((w) => ({ ...w, [route.key]: (w[route.key] ?? 0) + 1 }));
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
                if (!solve) return;
                haptics.press();
                router.push('/camera');
              }}
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}
