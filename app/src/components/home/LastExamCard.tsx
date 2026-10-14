import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useExams } from '../../api/hooks';
import type { ExamResult } from '../../api/types';
import { formatDelta, formatNet } from '../../lib/format';
import { home, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Badge } from '../Badge';
import { isComplete } from '../exams/examMath';
import { Icon } from '../Icon';


/**
 * A small trend: a graphite line over a fosfor wash, the latest point ringed. Static (no
 * draw-in). `grow` lets it take the height its parent gives it (up to `layout.chart.sparkGrowMax` × its own).
 */
function TrendSpark({ values, max, grow = false }: { values: number[]; max: number; grow?: boolean }) {
  const theme = useTheme();
  const dims = theme.layout.chart;
  const c = theme.colors.chart;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const width = box.w;
  const height = grow && box.h > 0 ? box.h : dims.sparkHeight;
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
    <View
      style={grow ? { flexGrow: 1, minHeight: dims.sparkHeight, maxHeight: dims.sparkHeight * theme.layout.chart.sparkGrowMax } : { height }}
      onLayout={(e: LayoutChangeEvent) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (Math.round(w) !== box.w || Math.round(h) !== box.h) setBox({ w: Math.round(w), h: Math.round(h) });
      }}
      aria-hidden
    >
      {width > 0 && last ? (
        // Out of the flow, so a grown sparkline doesn't hold its height once the sheet shrinks.
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          {area ? <Path d={area} fill={c.area} /> : null}
          {pts.length > 1 ? <Path d={line} stroke={c.line} strokeWidth={dims.lineWidth} strokeLinejoin="round" strokeLinecap="round" fill="none" /> : null}
          <Circle cx={last[0]} cy={last[1]} r={dims.markerRadius} fill={c.line} stroke={c.markerRing} strokeWidth={dims.ringWidth} />
        </Svg>
      ) : null}
    </View>
  );
}

/** The latest full deneme and the full ones of the same kind before it (oldest first); branş exams would skew the net and the trend, as in ExamSummary. */
function latestRun(items: ExamResult[]) {
  const byDate = items.filter(isComplete).sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  const last = byDate[byDate.length - 1];
  if (!last) return null;
  const same = byDate.filter((e) => e.exam === last.exam).slice(-home.lastExamPoints);
  return { last, prev: same.length > 1 ? same[same.length - 2]! : null, run: same };
}

/** Son deneme: the latest net, the change from the one before and a sparkline. Hidden without exams. */
export function useLastExam() {
  const items = useExams().data?.items;
  return items && items.length ? latestRun(items) : null;
}

/** "Son TYT denemen". */
export function examTitle(data: NonNullable<ReturnType<typeof useLastExam>>): string {
  return `Son ${data.last.exam} denemen`;
}

/**
 * Son deneme: the latest net in Lora, the change from the one before and a sparkline. `wide`
 * sets the sparkline beside the figure (a full-width row) instead of under it; `grow` (under
 * it) lets the sparkline take the height a stretched sheet gives. The caller makes it a press
 * target into the exams.
 */
export function ExamSection({ data, wide = false, grow = false }: { data: NonNullable<ReturnType<typeof useLastExam>>; wide?: boolean; grow?: boolean }) {
  const theme = useTheme();
  const { last, prev, run } = data;
  const delta = prev ? last.totalNet - prev.totalNet : null;
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  const heading = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {examTitle(data)}
      </AppText>
      {wide ? null : <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />}
    </View>
  );
  const figure = (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
      <AppText variant="stat">{formatNet(last.totalNet)}</AppText>
      <AppText variant="label" color="textMuted" style={{ flexGrow: wide ? 0 : 1 }}>
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
  );
  const spark = <TrendSpark values={run.map((e) => e.totalNet)} max={last.totalQuestions} grow={grow && !wide} />;

  if (wide) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          {heading}
          {figure}
        </View>
        <View style={{ flex: 1 }}>{spark}</View>
        <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
      </View>
    );
  }
  return (
    <View style={{ flexGrow: grow ? 1 : 0, gap: theme.spacing.md }}>
      {heading}
      {figure}
      {spark}
    </View>
  );
}
