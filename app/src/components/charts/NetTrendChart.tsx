import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { formatNet, shortDate } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { niceDomain } from './scale';
import { polylineLength, useDrawIn } from './useDrawIn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

export interface TrendDatum {
  key: string;
  date: string;
  label: string;
  value: number;
}

interface Props {
  data: TrendDatum[];
  /** Highest possible value (e.g. 120 for TYT total). */
  max: number;
  unit?: string;
}

interface MarksProps {
  points: { x: number; y: number }[];
  baseline: number;
  /** Index of the marker (selected or latest point). */
  shown: number;
  endLabel: string | null;
}

/** Line, area and end marker; drawn in from left to right when first shown. */
function TrendMarks({ points, baseline, shown, endLabel }: MarksProps) {
  const theme = useTheme();
  const c = theme.colors.chart;
  const dims = theme.layout.chart;
  const draw = useDrawIn();

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = points[0];
  const lastP = points[points.length - 1];
  const area =
    points.length > 1 && first && lastP
      ? `${line} L${lastP.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z`
      : '';
  const length = polylineLength(points);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ fillOpacity: draw.value }));
  // Marker and end label arrive once the line reaches them.
  const tipProps = useAnimatedProps(() => ({ opacity: Math.max(0, (draw.value - 0.85) / 0.15) }));

  const marker = points[shown];
  return (
    <>
      {area ? <AnimatedPath d={area} fill={c.area} animatedProps={areaProps} /> : null}
      {points.length > 1 ? (
        <AnimatedPath
          d={line}
          stroke={c.line}
          strokeWidth={dims.lineWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={lineProps}
        />
      ) : null}
      {/* Marker on the selected point (or the latest), ringed in the surface color. */}
      {marker ? (
        <AnimatedCircle
          cx={marker.x}
          cy={marker.y}
          r={dims.markerRadius}
          fill={c.line}
          stroke={c.markerRing}
          strokeWidth={dims.ringWidth}
          animatedProps={tipProps}
        />
      ) : null}
      {/* Direct label at the line end only. */}
      {endLabel && lastP ? (
        <AnimatedSvgText
          x={lastP.x + theme.spacing.sm}
          y={lastP.y + theme.fontSize.xs / 3}
          fontSize={theme.fontSize.xs}
          fontFamily={theme.fonts.sans.semibold}
          fill={theme.colors.text}
          animatedProps={tipProps}
        >
          {endLabel}
        </AnimatedSvgText>
      ) : null}
    </>
  );
}

/**
 * Single-series net trend: 2px line with a light area wash, hairline grid, value at the
 * end. Touch and drag to scrub; the readout above shows the selected exam (value first).
 */
export function NetTrendChart({ data, max, unit = 'net' }: Props) {
  const theme = useTheme();
  const c = theme.colors.chart;
  const dims = theme.layout.chart;
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const height = dims.trendHeight.compact;
  const top = theme.spacing.md;
  const bottom = theme.spacing.xl;
  const left = dims.axisWidth;
  const right = dims.endLabelWidth;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;

  const domain = useMemo(() => niceDomain(data.map((d) => d.value), max), [data, max]);
  const x = (i: number) => (data.length === 1 ? left + plotW / 2 : left + (i * plotW) / (data.length - 1));
  const y = (v: number) => top + plotH - ((v - domain.min) / (domain.max - domain.min)) * plotH;

  const points = data.map((d, i) => ({ x: x(i), y: y(d.value) }));

  // Refs keep the responder (created once) reading current layout and data.
  const geom = useRef({ left, plotW, n: data.length });
  geom.current = { left, plotW, n: data.length };

  const responder = useMemo(() => {
    const pick = (locationX: number) => {
      const { left: l, plotW: w, n } = geom.current;
      if (!n) return;
      const i = n === 1 ? 0 : Math.round(((locationX - l) / w) * (n - 1));
      const clamped = Math.min(n - 1, Math.max(0, i));
      setActive((prev) => {
        if (prev !== clamped) haptics.select();
        return clamped;
      });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
      // A vertical page scroll may take over; horizontal scrubbing stays here.
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  const shown = active ?? data.length - 1;
  const current = data[shown];
  const last = data.length - 1;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {current ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
          <AppText variant="title">{formatNet(current.value)}</AppText>
          <AppText variant="label" color="textMuted">
            {unit}
          </AppText>
          <AppText variant="label" color="textMuted" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
            {current.label} · {shortDate(current.date)}
          </AppText>
        </View>
      ) : null}

      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessibilityRole="image"
        accessibilityLabel={`Net grafiği, ${data.length} deneme. Son: ${current ? formatNet(data[last]!.value) : '—'} net.`}
        {...responder.panHandlers}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {domain.ticks.map((t) => (
              <Line key={`g${t}`} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke={c.grid} strokeWidth={theme.layout.borderWidth} />
            ))}
            {domain.ticks.map((t) => (
              <SvgText
                key={`t${t}`}
                x={left - theme.spacing.sm}
                y={y(t) + theme.fontSize.xs / 3}
                fontSize={theme.fontSize.xs}
                fontFamily={theme.fonts.sans.regular}
                fill={c.axisText}
                textAnchor="end"
              >
                {formatNet(t)}
              </SvgText>
            ))}

            {active !== null ? (
              <Line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke={c.crosshair} strokeWidth={theme.layout.borderWidth} />
            ) : null}

            <TrendMarks
              // Redraw when the data or the width changes.
              key={`${width}:${data.map((d) => `${d.key}=${d.value}`).join(',')}`}
              points={points}
              baseline={top + plotH}
              shown={shown}
              endLabel={data.length && active === null ? formatNet(data[last]!.value) : null}
            />

            {data.length ? (
              <SvgText x={x(0)} y={height - theme.spacing.xs} fontSize={theme.fontSize.xs} fontFamily={theme.fonts.sans.regular} fill={c.axisText} textAnchor={data.length === 1 ? 'middle' : 'start'}>
                {shortDate(data[0]!.date)}
              </SvgText>
            ) : null}
            {data.length > 1 ? (
              <SvgText x={x(last)} y={height - theme.spacing.xs} fontSize={theme.fontSize.xs} fontFamily={theme.fonts.sans.regular} fill={c.axisText} textAnchor="end">
                {shortDate(data[last]!.date)}
              </SvgText>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
