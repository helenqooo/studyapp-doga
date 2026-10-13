import { useId, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

interface Props {
  /** Band height (pt). Default `layout.kareli.bandHeight`. */
  height?: number;
  /** Lines fade out toward the bottom (default true); off: an even grid. */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Kareli": the graph-paper band behind headers and inside the hero. One SVG Path
 * (`layout.kareli.cell` squares, centered horizontally) stroked with a vertical gradient
 * from `optik` at `opacity.kareli` to transparent. No `<Pattern>`, so it renders the same
 * on iOS and web. Decorative: no touches, hidden from accessibility.
 */
export function Kareli({ height, fade = true, style }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gradientId = `kareli${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const h = height ?? theme.layout.kareli.bandHeight;
  const { cell } = theme.layout.kareli;
  const line = theme.layout.borderWidth;
  const top = theme.opacity.kareli[theme.scheme];

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  let d = '';
  if (width > 0) {
    // Half-point offsets keep 1 pt lines on whole pixels.
    const x0 = ((width % cell) / 2) + line / 2;
    for (let x = x0; x <= width; x += cell) d += `M${x.toFixed(1)} 0V${h}`;
    for (let y = line / 2; y <= h; y += cell) d += `M0 ${y.toFixed(1)}H${width}`;
  }

  return (
    <View pointerEvents="none" aria-hidden onLayout={onLayout} style={[{ height: h, width: '100%', overflow: 'hidden' }, style]}>
      {width > 0 ? (
        <Svg width={width} height={h}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2={h} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={theme.colors.optik} stopOpacity={top} />
              <Stop offset="1" stopColor={theme.colors.optik} stopOpacity={fade ? 0 : top} />
            </LinearGradient>
          </Defs>
          <Path d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth={line} />
        </Svg>
      ) : null}
    </View>
  );
}
