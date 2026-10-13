import { useFocusEffect, useNavigation, useScrollToTop } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContentSizeContext, contentSizeClass, useWindowLayout } from '../lib/layout';
import { useCompanionStore } from '../store/companionStore';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Kareli } from './Kareli';
import { LogoMark } from './Logo';

// TOKEN-PENDING: motion.scroll = { titleRate: 0.5, titleFadeEnd: 64, barFrom: 48, barTo: 72, rmSwitch: 56,
//   stackTitleFrom: 40, stackTitleTo: 72, bandRate: 0.35, bandFadeEnd: 160, rmFade: 120 } (design spec 5.2)
const SCROLL = {
  titleRate: 0.5,
  titleFadeEnd: 64,
  barFrom: 48,
  barTo: 72,
  rmSwitch: 56,
  stackTitleFrom: 40,
  stackTitleTo: 72,
  bandRate: 0.35,
  bandFadeEnd: 160,
  rmFade: 120,
};
// TOKEN-PENDING: opacity.headerBar = 0.96 (the compact header bar's paper)
const BAR_OPACITY = 0.96;

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Pad the top by the safe-area inset (tab screens without a header). */
  safeTop?: boolean;
  /** `dashboard` (alias `wide`) for dashboards and lists, `readable` for single-column reading and forms. */
  width?: 'dashboard' | 'wide' | 'readable';
  /** Small accent mark before the title; `logo` is the Lumi mark. */
  titleIcon?: IconName | 'logo';
  /** @deprecated Renders as a muted caption above the title (sentence case, no tracking). */
  eyebrow?: string;
  /** Floats over the bottom of the page (the answer dock); the page scrolls clear of it. */
  dock?: ReactNode;
  /** Actions beside the title (tab screens: repeated in the compact bar; stack screens: the native header). */
  headerRight?: ReactNode;
  /** The graph-paper band behind the header; tab screens default to `kareli`. */
  band?: 'kareli' | 'none';
}

/** Scrolls a part of the page into view if it is (mostly) below the visible area. */
const RevealContext = createContext<(target: View | null) => void>(() => {});

/** The focused Screen's scroll offset (UI thread). */
const ScreenScrollContext = createContext<SharedValue<number> | null>(null);

/** Returns `reveal(view)`, for guiding the eye to something that just appeared. */
export function useReveal() {
  return useContext(RevealContext);
}

/** The enclosing Screen's vertical scroll offset, for scroll-driven effects. */
export function useScreenScroll(): SharedValue<number> {
  const fallback = useSharedValue(0);
  return useContext(ScreenScrollContext) ?? fallback;
}

/** Its children scroll into view when they first appear (a new hint, the solution, a verdict). */
export function RevealOnMount({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reveal = useReveal();
  const ref = useRef<View>(null);
  const done = useRef(false);
  return (
    <View
      ref={ref}
      onLayout={() => {
        if (done.current) return;
        done.current = true;
        setTimeout(() => reveal(ref.current), delay);
      }}
    >
      {children}
    </View>
  );
}

/** Scroll bookkeeping for `reveal`: offset, viewport and the part covered by a dock or the strip. */
function useRevealer(
  scrollTo: (y: number, animated: boolean) => void,
  contentRef: RefObject<View | null>,
  topPad: number,
  covered: number,
  getOffset: () => number,
) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const viewport = useRef(0);
  const cover = useRef(covered);
  cover.current = covered;
  const offset = useRef(getOffset);
  offset.current = getOffset;
  const scroll = useRef(scrollTo);
  scroll.current = scrollTo;
  const reveal = useCallback(
    (target: View | null) => {
      const content = contentRef.current;
      if (!target || !content) return;
      try {
        target.measureLayout(
          content,
          (_x, y, _w, h) => {
            const top = y + topPad;
            const visibleBottom = offset.current() + viewport.current - cover.current;
            // Enough of it already shows: leave the page where the student put it.
            if (top + Math.min(h, theme.layout.revealPeek) <= visibleBottom) return;
            scroll.current(Math.max(0, top - viewport.current * theme.layout.revealAt), !reduceMotion);
          },
          () => {},
        );
      } catch {
        // Not measurable (unmounted): nothing to do.
      }
    },
    [contentRef, topPad, reduceMotion, theme.layout.revealPeek, theme.layout.revealAt],
  );
  const onViewport = useCallback((h: number) => {
    viewport.current = h;
  }, []);
  return { reveal, onViewport };
}

/** The dock's slot: pinned to the bottom (above the strip on tab screens), centered, reporting its height. */
function DockSlot({ children, maxWidth, onHeight, tabInset = 0 }: { children: ReactNode; maxWidth: number; onHeight: (h: number) => void; tabInset?: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowLayout();
  useEffect(() => () => onHeight(0), [onHeight]);
  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: tabInset,
        paddingHorizontal: win.margin,
        paddingBottom: tabInset ? theme.spacing.sm : insets.bottom + theme.spacing.sm,
      }}
    >
      <View pointerEvents="box-none" style={{ width: '100%', maxWidth, alignSelf: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/** Threshold switch for Reduce Motion: 0 → 1 once the scroll passes `at`, with a short fade. */
function useSwitch(scrollY: SharedValue<number>, at: number, active: boolean) {
  const v = useSharedValue(0);
  useAnimatedReaction(
    () => active && scrollY.value > at,
    (on, prev) => {
      if (on === prev) return;
      v.value = withTiming(on ? 1 : 0, { duration: SCROLL.rmFade, reduceMotion: ReduceMotion.Never });
    },
    [active, at],
  );
  return v;
}

/** The native header title on stack screens: fades in once the in-content title scrolls away. */
function FadingHeaderTitle({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const reduceMotion = useReducedMotion();
  const rm = useSwitch(scrollY, SCROLL.rmSwitch, reduceMotion);
  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? rm.value : interpolate(scrollY.value, [SCROLL.stackTitleFrom, SCROLL.stackTitleTo], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={style}>
      <AppText variant="heading" numberOfLines={1}>
        {title}
      </AppText>
    </Animated.View>
  );
}

/**
 * Scrolling page. Content is centered with a max width and its measured width is
 * provided to children (see useContentSize), so grids adapt to iPad, split view and
 * rotation rather than to the device model.
 *
 * On tab screens it pads clear of the optik strip, scrolls to top on a tab re-tap, drives
 * the strip's compaction (through the companion store's active scroll), lays a graph-paper
 * band behind the header and collapses the large title into a compact bar. On stack screens
 * with a `title`, the native header title fades in once the in-content title has scrolled away.
 */
export function Screen({ title, subtitle, children, safeTop = true, width = 'dashboard', titleIcon, eyebrow, dock, headerRight, band }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const navigation = useNavigation();
  const tabContext = useContext(BottomTabBarHeightContext);
  const isTab = tabContext !== undefined;
  const tabInset = tabContext ?? 0;
  const showBand = (band ?? (isTab ? 'kareli' : 'none')) === 'kareli';

  const maxWidth = width === 'readable' ? theme.layout.readableWidth : theme.layout.dashboardWidth;
  const [outer, setOuter] = useState(win.width);
  const [dockHeight, setDockHeight] = useState(0);
  const contentWidth = Math.max(0, Math.min(outer - win.margin * 2, maxWidth));
  const sideInset = Math.max(win.margin, (outer - contentWidth) / 2);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const contentRef = useRef<View>(null);
  const topPad = (safeTop ? insets.top : 0) + theme.spacing.lg;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const scrollTo = useCallback(
    (y: number, animated: boolean) => {
      scrollRef.current?.scrollTo({ y, animated });
    },
    [scrollRef],
  );
  const { reveal, onViewport } = useRevealer(scrollTo, contentRef, topPad, dockHeight + tabInset, () => scrollY.value);

  // Re-tapping the focused tab scrolls back to the top.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useScrollToTop(scrollRef as any);

  // While focused, this is the scroll the strip and the companion follow.
  useFocusEffect(
    useCallback(() => {
      useCompanionStore.getState().setActiveScroll(scrollY);
      return () => {
        const store = useCompanionStore.getState();
        if (store.activeScroll === scrollY) store.setActiveScroll(null);
      };
    }, [scrollY]),
  );

  // Stack screens: the native title fades in after scroll; headerRight goes into the native header.
  const headerRightRef = useRef(headerRight);
  headerRightRef.current = headerRight;
  const hasHeaderRight = !!headerRight;
  useLayoutEffect(() => {
    if (isTab) return;
    const options: Record<string, unknown> = {};
    if (title) options.headerTitle = () => <FadingHeaderTitle title={title} scrollY={scrollY} />;
    if (hasHeaderRight) options.headerRight = () => headerRightRef.current;
    if (Object.keys(options).length) navigation.setOptions(options);
  }, [isTab, title, hasHeaderRight, navigation, scrollY]);

  // Tab screens: the large title drifts and fades; a compact bar fades in over it.
  const collapse = isTab && !!title;
  const rmBar = useSwitch(scrollY, SCROLL.rmSwitch, collapse && reduceMotion);
  const [barOn, setBarOn] = useState(false);
  useAnimatedReaction(
    () => collapse && scrollY.value > (SCROLL.barFrom + SCROLL.barTo) / 2,
    (on, prev) => {
      if (on !== prev) runOnJS(setBarOn)(on);
    },
    [collapse],
  );
  const titleStyle = useAnimatedStyle(() => {
    if (!collapse) return {};
    if (reduceMotion) return { opacity: 1 - rmBar.value };
    const y = Math.max(0, scrollY.value);
    return {
      opacity: interpolate(y, [0, SCROLL.titleFadeEnd], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: y * SCROLL.titleRate }],
    };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? rmBar.value : interpolate(scrollY.value, [SCROLL.barFrom, SCROLL.barTo], [0, 1], Extrapolation.CLAMP),
  }));
  const bandStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const y = Math.max(0, scrollY.value);
    return {
      opacity: interpolate(y, [0, SCROLL.bandFadeEnd], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: y * SCROLL.bandRate }],
    };
  });

  const titleRow = title ? (
    <Animated.View style={[{ gap: theme.spacing.xs }, titleStyle]}>
      {eyebrow ? (
        <AppText variant="caption" color="textMuted">
          {eyebrow}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {titleIcon === 'logo' ? (
          <LogoMark size={theme.layout.iconSize.lg} />
        ) : titleIcon ? (
          <Icon name={titleIcon} size={theme.layout.iconSize.lg} color={theme.colors.accent} />
        ) : null}
        <AppText variant="title" accessibilityRole="header" style={{ flexShrink: 1, flexGrow: 1 }}>
          {title}
        </AppText>
        {isTab && headerRight ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>{headerRight}</View> : null}
      </View>
      {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
    </Animated.View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: win.margin,
          paddingBottom: theme.spacing.xxl + dockHeight + tabInset,
        }}
        scrollIndicatorInsets={{ bottom: dockHeight + tabInset }}
        onLayout={(e: LayoutChangeEvent) => {
          setOuter(e.nativeEvent.layout.width);
          onViewport(e.nativeEvent.layout.height);
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Tab screens pad by the safe area themselves; screens under a native header let iOS adjust.
        contentInsetAdjustmentBehavior={safeTop ? 'never' : 'automatic'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {showBand ? (
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, bandStyle]}>
            <Kareli height={theme.layout.kareli.bandHeight} />
          </Animated.View>
        ) : null}
        <ScreenScrollContext.Provider value={scrollY}>
          <RevealContext.Provider value={reveal}>
            <ContentSizeContext.Provider value={{ width: contentWidth, size: contentSizeClass(theme, contentWidth) }}>
              <View ref={contentRef} style={{ width: '100%', maxWidth, alignSelf: 'center', gap: theme.spacing.lg }}>
                {titleRow}
                {children}
              </View>
            </ContentSizeContext.Provider>
          </RevealContext.Provider>
        </ScreenScrollContext.Provider>
      </Animated.ScrollView>

      {collapse ? (
        <Animated.View
          pointerEvents={barOn ? 'box-none' : 'none'}
          accessibilityElementsHidden={!barOn}
          importantForAccessibility={barOn ? 'auto' : 'no-hide-descendants'}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }, barStyle]}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.background,
                opacity: BAR_OPACITY,
                borderBottomWidth: theme.layout.borderWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          />
          <View
            style={{
              minHeight: theme.layout.minTouch,
              paddingHorizontal: sideInset,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <AppText variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {title}
            </AppText>
            {headerRight ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>{headerRight}</View> : null}
          </View>
        </Animated.View>
      ) : null}

      {dock ? (
        <DockSlot maxWidth={maxWidth} onHeight={setDockHeight} tabInset={tabInset}>
          {dock}
        </DockSlot>
      ) : null}
    </View>
  );
}

function Pane({ children, flex, dock }: { children: ReactNode; flex: number; dock?: ReactNode }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const offset = useRef(0);
  const scrollTo = useCallback((y: number, animated: boolean) => scrollRef.current?.scrollTo({ y, animated }), []);
  const { reveal, onViewport } = useRevealer(scrollTo, contentRef, theme.spacing.lg, dockHeight, () => offset.current);
  return (
    <View style={{ flex }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xxl + dockHeight }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        onLayout={(e: LayoutChangeEvent) => {
          setWidth(e.nativeEvent.layout.width);
          onViewport(e.nativeEvent.layout.height);
        }}
      >
        <RevealContext.Provider value={reveal}>
          <ContentSizeContext.Provider value={{ width, size: contentSizeClass(theme, width) }}>
            <View ref={contentRef} style={{ gap: theme.spacing.lg }}>
              {children}
            </View>
          </ContentSizeContext.Provider>
        </RevealContext.Provider>
      </ScrollView>
      {dock ? (
        <DockSlot maxWidth={theme.layout.readableWidth} onHeight={setDockHeight}>
          {dock}
        </DockSlot>
      ) : null}
    </View>
  );
}

/**
 * Two side-by-side panes that scroll independently (large iPad windows), e.g. the
 * question on the left stays in view while the solution scrolls on the right; a dock
 * floats over the bottom of the right pane.
 */
export function SplitScreen({ left, right, dock }: { left: ReactNode; right: ReactNode; dock?: ReactNode }) {
  const theme = useTheme();
  const win = useWindowLayout();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        gap: theme.spacing.xl,
        paddingHorizontal: win.margin,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pane flex={theme.layout.splitLeft}>{left}</Pane>
      <Pane flex={1 - theme.layout.splitLeft} dock={dock}>
        {right}
      </Pane>
    </View>
  );
}
