import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { polylineLength, useDrawIn } from './useDrawIn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function SparkMarks({ points, color }: { points: { x: number; y: number }[]; color: string }) {
  const theme = useTheme();
  const c = theme.colors.chart;
  const dims = theme.layout.chart;
  const draw = useDrawIn();
  const length = polylineLength(points);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const tipProps = useAnimatedProps(() => ({ opacity: Math.max(0, (draw.value - 0.85) / 0.15) }));
  const last = points[points.length - 1];
  return (
    <>
      {points.length > 1 ? (
        <AnimatedPath
          d={d}
          stroke={color}
          strokeWidth={dims.lineWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={lineProps}
        />
      ) : null}
      {last ? (
        <AnimatedCircle cx={last.x} cy={last.y} r={dims.markerRadius} fill={color} stroke={c.markerRing} strokeWidth={dims.ringWidth} animatedProps={tipProps} />
      ) : null}
    </>
  );
}

/**
 * Tiny trend line for a stat tile: 2px line, ringed end marker on the latest value. `color`
 * (a raw token, e.g. a subject ink) defaults to the chart line.
 */
export function Sparkline({ values, max, color }: { values: number[]; max: number; color?: string }) {
  const theme = useTheme();
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
  const points = values.map((v, i) => ({ x: x(i), y: y(v) }));

  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length ? (
        <Svg width={width} height={height}>
          <SparkMarks key={`${width}:${values.join(',')}`} points={points} color={color ?? theme.colors.chart.line} />
        </Svg>
      ) : null}
    </View>
  );
}
