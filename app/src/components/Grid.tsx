import { Children, cloneElement, createContext, isValidElement, useContext, useState, type ReactElement, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { ContentSizeContext, contentSizeClass, useResponsive, useWindowLayout, type SizeClass } from '../lib/layout';
import { useTheme } from '../theme';
import { Appear } from './motion/Appear';

interface Props {
  children: ReactNode;
  /** Columns per content size class; missing classes fall back to the smaller one. */
  columns: { compact: number; regular?: number; wide?: number };
}

/** Appear inside a cell stretches to the cell, so cards in a row end at the same height. */
function fillCell(item: ReactNode) {
  if (!isValidElement(item) || item.type !== Appear) return item;
  const el = item as ReactElement<{ style?: StyleProp<ViewStyle> }>;
  return cloneElement(el, { style: [{ flex: 1 }, el.props.style] });
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
              {fillCell(item)}
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

/**
 * Two columns side by side when there is room, stacked otherwise. `stackBelow` is the
 * content size class from which they sit side by side (default `wide`).
 */
export function Columns({
  left,
  right,
  ratio = 1,
  stackBelow = 'wide',
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: number;
  stackBelow?: 'regular' | 'wide';
}) {
  const theme = useTheme();
  const side = useResponsive({ compact: false, regular: stackBelow === 'regular', wide: true });
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

/** Columns in the window grid by size class: 4 (phone), 8 (tablet portrait), 12 (landscape). */
const RowContext = createContext<{ sizeClass: SizeClass; columns: number; gutter: number }>({ sizeClass: 'compact', columns: 4, gutter: 12 });

/**
 * A row of the 4 / 8 / 12-column window grid (`layout.grid`). Cols wrap onto the next line
 * when their spans add up past the column count; `gap` is the space between wrapped lines
 * (defaults to the gutter).
 */
export function Row({ children, gap, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const { columns, gutter } = theme.layout.grid[sizeClass];
  return (
    <RowContext.Provider value={{ sizeClass, columns, gutter }}>
      <View
        style={[
          { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', marginHorizontal: -gutter / 2, rowGap: gap ?? gutter },
          style,
        ]}
      >
        {children}
      </View>
    </RowContext.Provider>
  );
}

type Span = { compact: number; regular?: number; wide?: number };

/** How many columns this Col takes here; a missing class keeps the compact share of the row. */
function spanFor(span: Span, sizeClass: SizeClass, columns: number, compactColumns: number) {
  const given = sizeClass === 'wide' ? span.wide : sizeClass === 'regular' ? span.regular : span.compact;
  const n = given ?? Math.round((span.compact / compactColumns) * columns);
  return Math.min(columns, Math.max(1, n));
}

/** A cell of a Row: spans columns per window size class and provides its width to Grids inside. */
export function Col({ span, children, style }: { span: Span; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { sizeClass, columns, gutter } = useContext(RowContext);
  const n = spanFor(span, sizeClass, columns, theme.layout.grid.compact.columns);
  const [width, setWidth] = useState(0);
  return (
    <View
      style={[{ width: `${(n / columns) * 100}%`, paddingHorizontal: gutter / 2, gap: theme.spacing.lg }, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.max(0, e.nativeEvent.layout.width - gutter))}
    >
      <ContentSizeContext.Provider value={{ width, size: contentSizeClass(theme, width) }}>{children}</ContentSizeContext.Provider>
    </View>
  );
}
