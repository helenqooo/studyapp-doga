import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLeaderboard, useProfile } from '../../api/hooks';
import { Col, Row } from '../../components/Grid';
import { Countdown } from '../../components/home/Countdown';
import { dayLine, greeting } from '../../components/home/dates';
import { useLastExam } from '../../components/home/LastExamCard';
import { ProgressPanel } from '../../components/home/ProgressPanel';
import { SolvePanel } from '../../components/home/SolvePanel';
import { TodayOptik } from '../../components/home/TodayOptik';
import { useTodayGoals, type TodayGoals } from '../../components/home/useTodayGoals';
import { Screen } from '../../components/Screen';
import { ErrorState } from '../../components/states/ErrorState';
import { localToday } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

const grow = { flexGrow: 1 } as const;


/**
 * How tall an iPad dashboard should be: down to where the page's padding above the strip
 * starts, but at most `home.stretchMax` past its own height, so a tall window (a 13" iPad) gets
 * a little air rather than sparse rows. The room mirrors Screen's tab padding: the safe area
 * and `spacing.lg` on top, the strip's reported height and `spacing.xxl` at the bottom.
 * The block's own height is measured unstretched, again whenever the window or `shape` (what
 * the page holds) changes. Undefined until measured.
 */
function useRoomToStrip(shape: string) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowLayout();
  const strip = useContext(BottomTabBarHeightContext) ?? 0;
  const [top, setTop] = useState<number | null>(null);
  const [natural, setNatural] = useState<number | null>(null);
  const key = `${width}x${height}|${shape}`;
  const [measuredFor, setMeasuredFor] = useState(key);
  if (measuredFor !== key) {
    setMeasuredFor(key);
    setNatural(null);
  }
  const room = top === null ? undefined : Math.max(0, height - insets.top - theme.spacing.lg - top - theme.spacing.xxl - strip);
  const minHeight = room === undefined || natural === null ? undefined : Math.min(room, natural + theme.home.stretchMax);
  const onLayout = (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    if (Math.round(y) !== top) setTop(Math.round(y));
    // Unstretched, or grown past the stretch: this is the block's own height.
    if (minHeight === undefined || h > minHeight + 1) setNatural(Math.round(h));
  };
  return { onLayout, minHeight };
}

function HomeContent({ goals }: { goals: TodayGoals }) {
  const theme = useTheme();
  const { sizeClass, tablet, landscape } = useWindowLayout();
  const exam = useLastExam();
  const board = useLeaderboard('week').data;
  const room = useRoomToStrip(`${goals.loaded}|${!!exam}|${!!board}`);
  const profile = useProfile();
  const error = profile.isError ? <ErrorState error={profile.error} onRetry={() => profile.refetch()} /> : null;
  const gap = tablet ? theme.layout.screen.gap.tablet : theme.layout.screen.gap.compact;

  if (sizeClass === 'wide' && landscape) {
    // iPad landscape, 8/4: the optik over the camera bar beside the progress sheet. Both
    // columns reach toward the strip; the optik's rows and the deneme's sparkline take the slack.
    return (
      <View onLayout={room.onLayout} style={{ minHeight: room.minHeight, gap }}>
        {error}
        <Row style={{ flexGrow: 1, alignContent: 'stretch' }}>
          <Col span={{ compact: 4, wide: 8 }} style={{ gap }}>
            <TodayOptik goals={goals} style={grow} />
            <SolvePanel layout="bar" />
          </Col>
          <Col span={{ compact: 4, wide: 4 }}>
            <ProgressPanel layout="column" fill />
          </Col>
        </Row>
      </View>
    );
  }

  if (tablet) {
    // iPad portrait (a 13" one too) and split view: the optik, the camera bar, then the progress
    // sheet (Seri beside Bu hafta over the deneme). The optik takes the slack.
    return (
      <View onLayout={room.onLayout} style={{ minHeight: room.minHeight, gap }}>
        {error}
        <TodayOptik goals={goals} style={grow} />
        <SolvePanel layout="bar" />
        <ProgressPanel layout="grid" />
      </View>
    );
  }

  // Phone: one column.
  return (
    <>
      {error}
      <TodayOptik goals={goals} />
      <SolvePanel layout="phone" />
      <ProgressPanel layout="column" />
    </>
  );
}

/** "Salı, 13 Ekim. Bugün 3 hedefin var.", or with a name "Salı, 13 Ekim. Zeynep, bugün 3 hedefin var." */
function caption(goals: TodayGoals, name: string) {
  const day = dayLine(localToday());
  const to = (line: string) => (name ? `${name}, ${line.charAt(0).toLocaleLowerCase('tr-TR')}${line.slice(1)}` : line);
  if (!goals.loaded) return `${day}.`;
  if (goals.remaining === 0) return `${day}. ${to('Bugünün optiği tamam.')}`;
  if (goals.remaining === 3) return `${day}. ${to('Bugün 3 hedefin var.')}`;
  return `${day}. ${to(`Bugün ${goals.remaining} hedefin kaldı.`)}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const name = useAuthStore((s) => s.user?.displayName);
  const goals = useTodayGoals();
  const { width, tablet } = useWindowLayout();
  // The demo user ("Sen") gets no name. The title keeps one line, so the countdown stays on
  // its baseline: the name joins the greeting only in a roomy window, moves to the subtitle
  // in a narrower tablet window and stays out on a phone (one-line subtitle); a phone also
  // drops "YKS'ye".
  const first = name && name !== 'Sen' ? name.split(' ')[0]! : '';
  const nameInTitle = !!first && width >= theme.home.titleNameMin;
  const hello = greeting(new Date().getHours());
  return (
    <Screen
      title={nameInTitle ? `${hello}, ${first}` : hello}
      subtitle={caption(goals, nameInTitle || !tablet ? '' : first)}
      headerRight={<Countdown short={!tablet} />}
    >
      <HomeContent goals={goals} />
    </Screen>
  );
}
