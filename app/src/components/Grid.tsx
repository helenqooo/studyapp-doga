import { Children, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { ContentSizeContext, contentSizeClass, useResponsive } from '../lib/layout';
import { useTheme } from '../theme';

interface Props {
  children: ReactNode;
  /** Columns per content size class; missing classes fall back to the smaller one. */
  columns: { compact: number; regular?: number; wide?: number };
}

/**
 * Equal-width columns that adapt to the measured content width. Items in a row stretch
 * to the same height; a short last row keeps the column width.
 */
export function Grid({ children, columns }: Props) {
  const theme = useTheme();
  const n = Math.max(1, useResponsive(columns));
  const items = Children.toArray(children);
  if (n === 1) return <View style={{ gap: theme.spacing.md }}>{items}</View>;

  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));

  return (
    <View style={{ gap: theme.spacing.md }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {row.map((item, i) => (
            <View key={i} style={{ flex: 1 }}>
              {item}
            </View>
          ))}
          {Array.from({ length: n - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Column({ children, flex }: { children: ReactNode; flex: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  return (
    <View style={{ flex, gap: theme.spacing.lg }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* Grids inside a column size themselves to the column, not the whole screen. */}
      <ContentSizeContext.Provider value={{ width, size: contentSizeClass(theme, width) }}>{children}</ContentSizeContext.Provider>
    </View>
  );
}

/** Two columns side by side when there is room (wide content), stacked otherwise. */
export function Columns({ left, right, ratio = 1 }: { left: ReactNode; right: ReactNode; ratio?: number }) {
  const theme = useTheme();
  const side = useResponsive({ compact: false, wide: true });
  if (!side) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'flex-start' }}>
      <Column flex={ratio}>{left}</Column>
      <Column flex={1}>{right}</Column>
    </View>
  );
}
