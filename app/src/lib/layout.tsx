import { createContext, useContext } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useTheme, type Theme } from '../theme';

export type SizeClass = 'compact' | 'regular' | 'wide';

export function contentSizeClass(theme: Theme, width: number): SizeClass {
  const b = theme.breakpoints.content;
  return width >= b.wide ? 'wide' : width >= b.regular ? 'regular' : 'compact';
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

/** Window-level decisions: navigation chrome and side-by-side screens. */
export function useWindowLayout() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    landscape: width > height,
    /** Tablet-sized window (iPad full screen or a large split). */
    tablet: width >= theme.breakpoints.content.regular,
    sidebar: width >= theme.breakpoints.window.sidebar,
    split: width >= theme.breakpoints.window.split,
    padding: width >= theme.breakpoints.content.regular ? theme.layout.screenPaddingRegular : theme.layout.screenPadding,
  };
}

/** True on iPad hardware, regardless of window size (split view can make it phone-narrow). */
export const isTabletDevice = Platform.OS === 'ios' && Platform.isPad;
