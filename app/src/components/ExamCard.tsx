import { router } from 'expo-router';
import { Fragment } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { ExamResult } from '../api/types';
import { SUBJECTS_BY_EXAM, type Exam } from '../data/topics';
import { formatDelta, formatNet, shortDate } from '../lib/format';
import { useContentSize, useWindowLayout } from '../lib/layout';
import { elevated, subjectColor, useTheme } from '../theme';
import { AppText } from './AppText';
import { Card, GroupDivider } from './Card';
import { DeltaChip } from './exams/DeltaChip';
import { examMax, isComplete, previousOf } from './exams/examMath';
import { NetStrip } from './exams/NetStrip';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';

/** AppText's `numeric` stops growing at this Dynamic Type scale. */
const NUMERIC_MAX_SCALE = 1.6;

export function examTitle(e: Pick<ExamResult, 'name' | 'exam'>): string {
  return e.name || `${e.exam} denemesi`;
}

interface RowProps {
  exam: ExamResult;
  /** The previous full exam of the same type, for the delta. */
  previous?: ExamResult | null;
  /** One line (name, strip, net, delta) when the sheet is wide; else the strip sits under the name. */
  inline: boolean;
  first: boolean;
  last: boolean;
}

/**
 * One exam in its type's list: name and date, the net strip (subject inks on the full exam's
 * scale), the net in numeric figures and a plain delta, then a chevron. The press tint runs
 * edge to edge and follows the sheet's corners on the first and last rows.
 */
function ExamRow({ exam, previous, inline, first, last }: RowProps) {
  const theme = useTheme();
  const { tablet, sheetPadding } = useWindowLayout();
  const { fontScale } = useWindowDimensions();
  const netCol = Math.ceil((tablet ? theme.layout.examRow.netCol.tablet : theme.layout.examRow.netCol.compact) * Math.min(Math.max(fontScale, 1), NUMERIC_MAX_SCALE));
  const g = theme.layout.group;
  const r = elevated(theme, 'sheet').borderRadius;
  const full = isComplete(exam);
  const delta = previous ? exam.totalNet - previous.totalNet : null;

  const name = (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText weight="medium" numberOfLines={2}>
        {examTitle(exam)}
      </AppText>
      <AppText variant="caption" color="textMuted" numberOfLines={1}>
        {shortDate(exam.date)}
        {full ? '' : ', branş denemesi'}
      </AppText>
    </View>
  );
  const strip = <NetStrip sections={exam.sections} max={examMax(exam.exam)} />;
  const net = (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: theme.spacing.xxs }}>
      <AppText variant="numeric">{formatNet(exam.totalNet)}</AppText>
      <AppText variant="caption" color="textMuted">
        /{exam.totalQuestions}
      </AppText>
    </View>
  );
  const change = delta !== null ? <DeltaChip delta={delta} look="plain" /> : null;

  return (
    <PressableScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={`${examTitle(exam)}, ${shortDate(exam.date)}, ${formatNet(exam.totalNet)} net${delta !== null ? `, öncekine göre ${formatDelta(delta)}` : ''}`}
      onPress={() => router.push({ pathname: '/exam/[id]', params: { id: exam.id } })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tablet ? theme.spacing.lg : theme.spacing.md,
        minHeight: tablet ? g.rowMinHeight.tablet : g.rowMinHeight.compact,
        paddingVertical: tablet ? g.rowPadY.tablet : g.rowPadY.compact,
        paddingHorizontal: sheetPadding,
        borderTopLeftRadius: first ? r : 0,
        borderTopRightRadius: first ? r : 0,
        borderBottomLeftRadius: last ? r : 0,
        borderBottomRightRadius: last ? r : 0,
        borderCurve: 'continuous',
      }}
    >
      {inline ? (
        <>
          <View style={{ flex: 1, minWidth: 0 }}>{name}</View>
          <View style={{ width: theme.layout.examRow.stripShare }}>{strip}</View>
          <View style={{ width: netCol }}>{net}</View>
          <View style={{ width: theme.layout.examRow.deltaCol, alignItems: 'flex-end' }}>{change}</View>
        </>
      ) : (
        <>
          <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
            {name}
            {strip}
          </View>
          {/* A fixed width, so the strips beside it all get the same track. */}
          <View style={{ width: netCol, alignItems: 'flex-end', gap: theme.spacing.xxs }}>
            {net}
            {change}
          </View>
        </>
      )}
      <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} />
    </PressableScale>
  );
}

/** The subject inks of an exam type, as a quiet legend for the strips below it. */
export function SubjectLegend({ exam }: { exam: Exam }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.lg, rowGap: theme.spacing.xxs }} aria-hidden>
      {SUBJECTS_BY_EXAM[exam].map((s) => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: subjectColor(theme, s) }} />
          <AppText variant="caption" color="textMuted">
            {s}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * An exam type's exams in one sheet, newest first, split by optik hairlines. Rows go on one
 * line once the sheet is wide enough for the strip beside the name.
 */
export function ExamRows({ items, all }: { items: readonly ExamResult[]; all: readonly ExamResult[] }) {
  const theme = useTheme();
  const { width } = useContentSize();
  const { sizeClass } = useWindowLayout();
  // Not measured yet: decide by the window so the first frame doesn't jump.
  const inline = width === 0 ? sizeClass === 'regular' : width >= theme.layout.examRow.inlineFrom;
  return (
    <Card style={{ padding: 0, gap: 0 }}>
      {items.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 ? <GroupDivider /> : null}
          <ExamRow exam={e} previous={previousOf(e, all)} inline={inline} first={i === 0} last={i === items.length - 1} />
        </Fragment>
      ))}
    </Card>
  );
}
