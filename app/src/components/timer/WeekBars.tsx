import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { useFontScale } from '../../lib/layout';
import { useTheme } from '../../theme';

// TOKEN-PENDING: layout.chart.weekHeight = 148 (the week's bar chart, labels included)
const HEIGHT = 148;
// TOKEN-PENDING: layout.chart.minBar = 2 (an empty day still shows a sliver)
const MIN_BAR = 2;

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/**
 * Focus minutes for the last days as bars that fill the measured width (one slot per day),
 * today's bar in `chart.today`, minutes over each bar and the day under it.
 */
export function WeekBars({ days }: { days: { date: string; focusSec: number }[] }) {
  const theme = useTheme();
  const fs = useFontScale();
  const [width, setWidth] = useState(0);
  const { barShare, labelGap } = theme.layout.chart.weekBar;
  const n = Math.max(1, days.length);
  const slot = width / n;
  const barW = slot * barShare;
  const top = fs.xs + labelGap;
  const bottom = fs.xs + labelGap * 2;
  const plot = HEIGHT - top - bottom;
  // An hour fills the plot at least, so a 10 minute day doesn't look like a full one.
  const max = Math.max(60 * 60, ...days.map((d) => d.focusSec));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ width: '100%', height: HEIGHT }}
      accessible
      accessibilityLabel={`Son ${days.length} günün odak süreleri: ${days.map((d) => `${Math.round(d.focusSec / 60)} dakika`).join(', ')}`}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {days.map((d, i) => {
            const h = Math.max(MIN_BAR, (plot * d.focusSec) / max);
            const x = i * slot + (slot - barW) / 2;
            const isToday = i === days.length - 1;
            const minutes = Math.round(d.focusSec / 60);
            return (
              <G key={d.date}>
                <Rect
                  x={x}
                  y={top + plot - h}
                  width={barW}
                  height={h}
                  rx={Math.min(theme.layout.chart.barEndRadius, barW / 2)}
                  fill={isToday ? theme.colors.chart.today : d.focusSec > 0 ? theme.colors.chart.bar : theme.colors.chart.grid}
                />
                {minutes > 0 ? (
                  <SvgText
                    x={x + barW / 2}
                    y={top + plot - h - labelGap}
                    fontSize={fs.xs}
                    fontFamily={theme.fonts.display.medium}
                    fill={theme.colors.text}
                    textAnchor="middle"
                  >
                    {minutes}
                  </SvgText>
                ) : null}
                <SvgText
                  x={x + barW / 2}
                  y={HEIGHT - labelGap}
                  fontSize={fs.xs}
                  fontFamily={isToday ? theme.fonts.sans.semibold : theme.fonts.sans.regular}
                  fill={isToday ? theme.colors.text : theme.colors.chart.axisText}
                  textAnchor="middle"
                >
                  {isToday ? 'Bugün' : DAY_NAMES[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
