import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme';

/** Tiny trend line for a stat tile: 2px line, ringed end marker on the latest value. */
export function Sparkline({ values, max }: { values: number[]; max: number }) {
  const theme = useTheme();
  const c = theme.colors.chart;
  const dims = theme.layout.chart;
  const [width, setWidth] = useState(0);
  const height = dims.sparkHeight;
  const pad = dims.markerRadius + dims.ringWidth;

  // Scale to the data (with headroom), never outside [0, max].
  const lo = Math.max(0, Math.min(...values) - 2);
  const hi = Math.min(max, Math.max(...values) + 2);
  const span = Math.max(hi - lo, 1);
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;

  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length ? (
        <Svg width={width} height={height}>
          {values.length > 1 ? (
            <Path d={d} stroke={c.line} strokeWidth={dims.lineWidth} strokeLinejoin="round" strokeLinecap="round" fill="none" />
          ) : null}
          <Circle cx={x(last)} cy={y(values[last]!)} r={dims.markerRadius} fill={c.line} stroke={c.markerRing} strokeWidth={dims.ringWidth} />
        </Svg>
      ) : null}
    </View>
  );
}
