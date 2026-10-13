import { router } from 'expo-router';
import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useExams } from '../../api/hooks';
import type { ExamResult } from '../../api/types';
import { formatDelta, formatNet } from '../../lib/format';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { Card } from '../Card';

// TOKEN-PENDING: home.lastExamPoints = 8 (exams shown in Son deneme's sparkline)
const SPARK_POINTS = 8;

/** A small trend: a graphite line over a fosfor wash, the latest point ringed. Static (no draw-in). */
function TrendSpark({ values, max }: { values: number[]; max: number }) {
  const theme = useTheme();
  const dims = theme.layout.chart;
  const c = theme.colors.chart;
  const [width, setWidth] = useState(0);
  const height = dims.sparkHeight;
  const pad = dims.markerRadius + dims.ringWidth;
  const lo = Math.max(0, Math.min(...values) - 2);
  const hi = Math.min(max, Math.max(...values) + 2);
  const span = Math.max(hi - lo, 1);
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = first && last && pts.length > 1 ? `${line} L${last[0].toFixed(1)} ${height} L${first[0].toFixed(1)} ${height} Z` : '';
  return (
    <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} aria-hidden>
      {width > 0 && last ? (
        <Svg width={width} height={height}>
          {area ? <Path d={area} fill={c.area} /> : null}
          {pts.length > 1 ? <Path d={line} stroke={c.line} strokeWidth={dims.lineWidth} strokeLinejoin="round" strokeLinecap="round" fill="none" /> : null}
          <Circle cx={last[0]} cy={last[1]} r={dims.markerRadius} fill={c.line} stroke={c.markerRing} strokeWidth={dims.ringWidth} />
        </Svg>
      ) : null}
    </View>
  );
}

/** The latest deneme and the ones of the same kind before it (oldest first). */
function latestRun(items: ExamResult[]) {
  const byDate = [...items].sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  const last = byDate[byDate.length - 1];
  if (!last) return null;
  const same = byDate.filter((e) => e.exam === last.exam).slice(-SPARK_POINTS);
  return { last, prev: same.length > 1 ? same[same.length - 2]! : null, run: same };
}

/** Son deneme: the latest net, the change from the one before and a sparkline. Hidden without exams. */
export function useLastExam() {
  const items = useExams().data?.items;
  return items && items.length ? latestRun(items) : null;
}

export function LastExamCard({ data, style }: { data: NonNullable<ReturnType<typeof useLastExam>>; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { last, prev, run } = data;
  const delta = prev ? last.totalNet - prev.totalNet : null;
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  const title = `Son ${last.exam} denemen`;
  return (
    <Card title={title} onPress={() => router.push('/exams')} accessibilityLabel={`${title}: ${formatNet(last.totalNet)} net. Denemeleri aç.`} style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <AppText variant="stat">{formatNet(last.totalNet)}</AppText>
        <AppText variant="label" color="textMuted" style={{ flexGrow: 1 }}>
          /{last.totalQuestions} net
        </AppText>
        {delta !== null ? (
          <Badge
            label={formatDelta(delta)}
            icon={up ? 'trending-up' : down ? 'trending-down' : undefined}
            color={up ? theme.colors.success : down ? theme.colors.danger : theme.colors.textMuted}
            background={up ? theme.colors.successSoft : down ? theme.colors.dangerSoft : theme.colors.surfaceAlt}
          />
        ) : null}
      </View>
      <TrendSpark values={run.map((e) => e.totalNet)} max={last.totalQuestions} />
    </Card>
  );
}
