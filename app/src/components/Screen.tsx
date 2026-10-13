import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContentSizeContext, contentSizeClass, useWindowLayout } from '../lib/layout';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { LogoMark } from './Logo';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Pad the top by the safe-area inset (tab screens without a header). */
  safeTop?: boolean;
  /** `wide` for dashboards and lists, `readable` for single-column reading and forms. */
  width?: 'wide' | 'readable';
  /** Small accent mark before the title; `logo` is the Lumi mark. */
  titleIcon?: IconName | 'logo';
  /** Small capitals above the title (pass them already uppercase, see upperTr). */
  eyebrow?: string;
  /** Floats over the bottom of the page (the answer dock); the page scrolls clear of it. */
  dock?: ReactNode;
}

/** Scrolls a part of the page into view if it is (mostly) below the visible area. */
const RevealContext = createContext<(target: View | null) => void>(() => {});

/** Returns `reveal(view)`, for guiding the eye to something that just appeared. */
export function useReveal() {
  return useContext(RevealContext);
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

/** Scroll bookkeeping for `reveal`: offset, viewport and the part covered by a dock. */
function useRevealer(scrollRef: RefObject<ScrollView | null>, contentRef: RefObject<View | null>, topPad: number, covered: number) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const offset = useRef(0);
  const viewport = useRef(0);
  const cover = useRef(covered);
  cover.current = covered;
  const reveal = useCallback(
    (target: View | null) => {
      const content = contentRef.current;
      if (!target || !content) return;
      try {
        target.measureLayout(
          content,
          (_x, y, _w, h) => {
            const top = y + topPad;
            const visibleBottom = offset.current + viewport.current - cover.current;
            // Enough of it already shows: leave the page where the student put it.
            if (top + Math.min(h, theme.layout.revealPeek) <= visibleBottom) return;
            scrollRef.current?.scrollTo({ y: Math.max(0, top - viewport.current * theme.layout.revealAt), animated: !reduceMotion });
          },
          () => {},
        );
      } catch {
        // Not measurable (unmounted): nothing to do.
      }
    },
    [contentRef, scrollRef, topPad, reduceMotion, theme.layout.revealPeek, theme.layout.revealAt],
  );
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);
  const onViewport = useCallback((h: number) => {
    viewport.current = h;
  }, []);
  return { reveal, onScroll, onViewport };
}

/** The dock's slot: pinned to the bottom, centered, reporting its height. */
function DockSlot({ children, maxWidth, onHeight }: { children: ReactNode; maxWidth: number; onHeight: (h: number) => void }) {
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
        bottom: 0,
        paddingHorizontal: win.padding,
        paddingBottom: insets.bottom + theme.spacing.sm,
      }}
    >
      <View pointerEvents="box-none" style={{ width: '100%', maxWidth, alignSelf: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Scrolling page. Content is centered with a max width and its measured width is
 * provided to children (see useContentSize), so grids adapt to iPad, split view and
 * rotation rather than to the device model.
 */
export function Screen({ title, subtitle, children, safeTop = true, width = 'wide', titleIcon, eyebrow, dock }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowLayout();
  const maxWidth = width === 'readable' ? theme.layout.readableWidth : theme.layout.maxContentWidth;
  const [outer, setOuter] = useState(win.width);
  const [dockHeight, setDockHeight] = useState(0);
  const contentWidth = Math.min(outer - win.padding * 2, maxWidth);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const topPad = (safeTop ? insets.top : 0) + theme.spacing.lg;
  const { reveal, onScroll, onViewport } = useRevealer(scrollRef, contentRef, topPad, dockHeight);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: win.padding,
          paddingBottom: theme.spacing.xxl + dockHeight,
        }}
        onLayout={(e: LayoutChangeEvent) => {
          setOuter(e.nativeEvent.layout.width);
          onViewport(e.nativeEvent.layout.height);
        }}
        onScroll={onScroll}
        scrollEventThrottle={32}
        // Tab screens pad by the safe area themselves; screens under a native header let iOS adjust.
        contentInsetAdjustmentBehavior={safeTop ? 'never' : 'automatic'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <RevealContext.Provider value={reveal}>
          <ContentSizeContext.Provider value={{ width: contentWidth, size: contentSizeClass(theme, contentWidth) }}>
            <View ref={contentRef} style={{ width: '100%', maxWidth, alignSelf: 'center', gap: theme.spacing.lg }}>
              {title ? (
                <View style={{ gap: theme.spacing.xs }}>
                  {eyebrow ? (
                    <AppText variant="eyebrow" color="textMuted">
                      {eyebrow}
                    </AppText>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    {titleIcon === 'logo' ? (
                      <LogoMark size={theme.layout.iconSize.lg} />
                    ) : titleIcon ? (
                      <Icon name={titleIcon} size={theme.layout.iconSize.lg} color={theme.colors.accent} />
                    ) : null}
                    <AppText variant="title" style={{ flexShrink: 1 }}>
                      {title}
                    </AppText>
                  </View>
                  {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
                </View>
              ) : null}
              {children}
            </View>
          </ContentSizeContext.Provider>
        </RevealContext.Provider>
      </ScrollView>
      {dock ? (
        <DockSlot maxWidth={maxWidth} onHeight={setDockHeight}>
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
  const { reveal, onScroll, onViewport } = useRevealer(scrollRef, contentRef, theme.spacing.lg, dockHeight);
  return (
    <View style={{ flex }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xxl + dockHeight }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
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
        paddingHorizontal: win.padding,
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
