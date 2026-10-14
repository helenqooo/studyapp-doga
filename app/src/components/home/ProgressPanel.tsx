import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLeaderboard } from '../../api/hooks';
import { useContentSize, useWindowLayout } from '../../lib/layout';
import { raceLine } from '../../lib/lumiLines';
import { useTheme } from '../../theme';
import { Card, GroupDivider } from '../Card';
import { PressableScale } from '../motion/PressableScale';
import { ExamSection, examTitle, useLastExam } from './LastExamCard';
import { LeagueSection } from './LeagueCard';
import { StreakSection } from './StreakCard';


/** Which corners of the sheet a part touches, so its press tint follows them. */
interface Corners {
  tl?: boolean;
  tr?: boolean;
  bl?: boolean;
  br?: boolean;
}

interface PartSpec {
  key: string;
  node: ReactNode;
  onPress?: () => void;
  label?: string;
}

/**
 * One part of the progress sheet, padded like a divided card's row, at its own height (a
 * stretched sheet's last part grows instead); a press target tints edge to edge.
 */
function Part({ part, corners, style }: { part: PartSpec; corners: Corners; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { sheetPadding, tablet } = useWindowLayout();
  const padY = (tablet ? theme.layout.group.rowPadY.tablet : theme.layout.group.rowPadY.compact) + theme.spacing.xs;
  const r = theme.radius.lg - theme.layout.borderWidth;
  const box: ViewStyle = {
    paddingHorizontal: sheetPadding,
    paddingVertical: padY,
    borderTopLeftRadius: corners.tl ? r : 0,
    borderTopRightRadius: corners.tr ? r : 0,
    borderBottomLeftRadius: corners.bl ? r : 0,
    borderBottomRightRadius: corners.br ? r : 0,
    borderCurve: 'continuous',
  };
  if (part.onPress) {
    return (
      <PressableScale kind="row" accessibilityRole="button" accessibilityLabel={part.label} onPress={part.onPress} style={[box, style]}>
        {part.node}
      </PressableScale>
    );
  }
  return <View style={[box, style]}>{part.node}</View>;
}

/** The hairline between two side-by-side parts, inset like the row hairlines. */
function ColumnRule() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const padY = (tablet ? theme.layout.group.rowPadY.tablet : theme.layout.group.rowPadY.compact) + theme.spacing.xs;
  return <View style={{ width: theme.layout.borderWidth, marginVertical: padY, backgroundColor: theme.colors.optikSoft }} />;
}

/**
 * Home's progress, quiet and in one sheet: Seri (streak, week, level), Bu hafta (a small
 * standing) and the last deneme, split by optik hairlines; the parts with data only.
 * `column` stacks them (iPad landscape beside the hero, phone); `grid` sets Seri and Bu hafta
 * side by side over a full-width deneme row (iPad portrait), so the columns end together; in
 * a narrower window (split view) it stacks too. `fill` (a column beside the hero) stretches
 * the sheet to its column when the deneme ends it, its sparkline taking the height; without
 * a deneme the sheet keeps its own height rather than holding empty bands.
 */
export function ProgressPanel({ layout, fill = false, style }: { layout: 'column' | 'grid'; fill?: boolean; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { width } = useContentSize();
  const exam = useLastExam();
  const board = useLeaderboard('week').data;
  const race = raceLine(board);

  const streak: PartSpec = { key: 'streak', node: <StreakSection /> };
  const league: PartSpec | null =
    race && board
      ? {
          key: 'league',
          node: <LeagueSection board={board} race={race} />,
          onPress: () => router.push('/leaderboard'),
          label: `${race.title}. ${race.detail} Sıralamayı aç.`,
        }
      : null;
  const examPart = (wide: boolean, grow = false): PartSpec | null =>
    exam
      ? {
          key: 'exam',
          node: <ExamSection data={exam} wide={wide} grow={grow} />,
          onPress: () => router.push('/exams'),
          label: `${examTitle(exam)}: ${exam.last.totalNet} net. Denemeleri aç.`,
        }
      : null;

  const sheet = [{ padding: 0, gap: 0 }, style];

  if (layout === 'grid' && width >= theme.home.progressGridMin) {
    // Seri beside Bu hafta, the deneme under both; with one of them missing, the other sits beside Seri.
    const second = league ?? examPart(false);
    const below = league ? examPart(true) : null;
    return (
      <Card style={sheet}>
        <View style={{ flexDirection: 'row' }}>
          <Part part={streak} corners={{ tl: true, bl: !below, tr: !second, br: !second && !below }} style={{ flex: 1 }} />
          {second ? (
            <>
              <ColumnRule />
              <Part part={second} corners={{ tr: true, br: !below }} style={{ flex: 1 }} />
            </>
          ) : null}
        </View>
        {below ? (
          <>
            <GroupDivider />
            <Part part={below} corners={{ bl: true, br: true }} />
          </>
        ) : null}
      </Card>
    );
  }

  const stretch = fill && !!exam;
  const parts = [streak, league, examPart(false, stretch)].filter((p): p is PartSpec => !!p);
  return (
    <Card style={[sheet, stretch ? { flexGrow: 1 } : null]}>
      {parts.map((p, i) => {
        const last = i === parts.length - 1;
        return (
          <Fragment key={p.key}>
            {i > 0 ? <GroupDivider /> : null}
            <Part part={p} corners={{ tl: i === 0, tr: i === 0, bl: last, br: last }} style={stretch && last ? { flexGrow: 1 } : undefined} />
          </Fragment>
        );
      })}
    </Card>
  );
}
