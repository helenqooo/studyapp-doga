import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { formatNet, shortDate } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { niceDomain } from './scale';

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

  const height = dims.trendHeight;
  const top = theme.spacing.md;
  const bottom = theme.spacing.xl;
  const left = dims.axisWidth;
  const right = dims.endLabelWidth;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;

  const domain = useMemo(() => niceDomain(data.map((d) => d.value), max), [data, max]);
  const x = (i: number) => (data.length === 1 ? left + plotW / 2 : left + (i * plotW) / (data.length - 1));
  const y = (v: number) => top + plotH - ((v - domain.min) / (domain.max - domain.min)) * plotH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = data.length > 1 ? `${line} L${x(data.length - 1).toFixed(1)},${top + plotH} L${x(0).toFixed(1)},${top + plotH} Z` : '';

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
                fill={c.axisText}
                textAnchor="end"
              >
                {formatNet(t)}
              </SvgText>
            ))}

            {area ? <Path d={area} fill={c.area} /> : null}
            {data.length > 1 ? (
              <Path d={line} stroke={c.line} strokeWidth={dims.lineWidth} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            ) : null}

            {active !== null ? (
              <Line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke={c.crosshair} strokeWidth={theme.layout.borderWidth} />
            ) : null}

            {/* Marker on the selected point (or the latest), ringed in the surface color. */}
            {current ? (
              <Circle
                cx={x(shown)}
                cy={y(current.value)}
                r={dims.markerRadius}
                fill={c.line}
                stroke={c.markerRing}
                strokeWidth={dims.ringWidth}
              />
            ) : null}

            {/* Direct label at the line end only. */}
            {data.length && active === null ? (
              <SvgText
                x={x(last) + theme.spacing.sm}
                y={y(data[last]!.value) + theme.fontSize.xs / 3}
                fontSize={theme.fontSize.xs}
                fontWeight={theme.fontWeight.bold}
                fill={theme.colors.text}
              >
                {formatNet(data[last]!.value)}
              </SvgText>
            ) : null}

            {data.length ? (
              <SvgText x={x(0)} y={height - theme.spacing.xs} fontSize={theme.fontSize.xs} fill={c.axisText} textAnchor={data.length === 1 ? 'middle' : 'start'}>
                {shortDate(data[0]!.date)}
              </SvgText>
            ) : null}
            {data.length > 1 ? (
              <SvgText x={x(last)} y={height - theme.spacing.xs} fontSize={theme.fontSize.xs} fill={c.axisText} textAnchor="end">
                {shortDate(data[last]!.date)}
              </SvgText>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
