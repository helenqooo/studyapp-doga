import { createContext, useContext } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { fontSize, fontSizeTablet, useTheme, type FontScale, type Theme } from '../theme';

export type SizeClass = 'compact' | 'regular' | 'wide';

export function contentSizeClass(theme: Theme, width: number): SizeClass {
  const b = theme.breakpoints.content;
  return width >= b.wide ? 'wide' : width >= b.regular ? 'regular' : 'compact';
}

/** The window's size class: the 4 / 8 / 12-column grid (< 560, < 1000, ≥ 1000 pt). */
export function windowSizeClass(theme: Theme, width: number): SizeClass {
  const b = theme.breakpoints.window;
  return width >= b.landscape ? 'wide' : width >= b.tablet ? 'regular' : 'compact';
}

/** Width available to a screen's content, measured by Screen / SplitScreen. */
export const ContentSizeContext = createContext<{ width: number; size: SizeClass }>({ width: 0, size: 'compact' });

export function useContentSize() {
  return useContext(ContentSizeContext);
}

/** Picks a value per content size class, falling back to the next smaller one. */
export function useResponsive<T>(values: { compact: T; regular?: T; wide?: T }): T {
  const { size } = useContentSize();
  if (size === 'wide') return values.wide ?? values.regular ?? values.compact;
  if (size === 'regular') return values.regular ?? values.compact;
  return values.compact;
}

/** Window-level decisions: chrome, type size, the grid and side-by-side screens. */
export function useWindowLayout() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const sizeClass = windowSizeClass(theme, width);
  const tablet = width >= theme.breakpoints.window.tablet;
  return {
    width,
    height,
    /** Orientation: the window is wider than tall. */
    landscape: width > height,
    /** Tablet-sized window (iPad full screen or a large split): tablet type sizes and chrome. */
    tablet,
    split: width >= theme.breakpoints.window.split,
    sizeClass,
    /** The grid's side margin for this window (16 / 28 / 32). */
    margin: theme.layout.grid[sizeClass].margin,
    /** @deprecated use `margin` (the grid). The old screen padding: 16 on phone, 24 on tablet. */
    padding: tablet ? theme.layout.screenPaddingRegular : theme.layout.screenPadding,
  };
}

/**
 * The raw font-size table for this window (`fontSize`, or `fontSizeTablet` once the window
 * is ≥ 560 pt), for text drawn outside AppText: SvgText, TextInput, tab labels.
 */
export function useFontScale(): FontScale {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  return width >= theme.breakpoints.window.tablet ? fontSizeTablet : fontSize;
}

/** True on iPad hardware, regardless of window size (split view can make it phone-narrow). */
export const isTabletDevice = Platform.OS === 'ios' && Platform.isPad;
