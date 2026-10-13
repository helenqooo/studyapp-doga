import { View } from 'react-native';
import { useLeaderboard, useProfile } from '../../api/hooks';
import { Col, Row } from '../../components/Grid';
import { Countdown } from '../../components/home/Countdown';
import { dayLine, greeting } from '../../components/home/dates';
import { LastExamCard, useLastExam } from '../../components/home/LastExamCard';
import { LeagueCard } from '../../components/home/LeagueCard';
import { SolvePanel } from '../../components/home/SolvePanel';
import { StreakCard } from '../../components/home/StreakCard';
import { TodayOptik } from '../../components/home/TodayOptik';
import { useTodayGoals, type TodayGoals } from '../../components/home/useTodayGoals';
import { Screen } from '../../components/Screen';
import { ErrorState } from '../../components/states/ErrorState';
import { localToday } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { raceLine } from '../../lib/lumiLines';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';

const fill = { flex: 1 } as const;

/** The progress sheets under the hero (Seri, Bu hafta, Son deneme), whichever have data. */
function useProgressSheets() {
  const exam = useLastExam();
  const league = !!raceLine(useLeaderboard('week').data);
  return { exam, league };
}

function HomeContent({ goals }: { goals: TodayGoals }) {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const profile = useProfile();
  const { exam, league } = useProgressSheets();
  const error = profile.isError ? <ErrorState error={profile.error} onRetry={() => profile.refetch()} /> : null;

  const streak = <StreakCard style={fill} />;
  const leagueCard = league ? <LeagueCard style={fill} /> : null;
  const examCard = exam ? <LastExamCard data={exam} style={fill} /> : null;

  if (sizeClass === 'wide') {
    // iPad landscape: the optik (7) beside the camera (5), then the progress sheets in thirds
    // (halves when one is missing). Everything sits above the strip at 820 pt.
    const span = 12 / (1 + (league ? 1 : 0) + (exam ? 1 : 0));
    return (
      <>
        {error}
        <Row>
          <Col span={{ compact: 4, wide: 7 }}>
            <TodayOptik goals={goals} style={fill} />
          </Col>
          <Col span={{ compact: 4, wide: 5 }}>
            <SolvePanel layout="side" style={fill} />
          </Col>
        </Row>
        <Row>
          <Col span={{ compact: 4, wide: span }}>{streak}</Col>
          {leagueCard ? <Col span={{ compact: 4, wide: span }}>{leagueCard}</Col> : null}
          {examCard ? <Col span={{ compact: 4, wide: span }}>{examCard}</Col> : null}
        </Row>
      </>
    );
  }

  if (sizeClass === 'regular') {
    // iPad portrait: the optik full width, then the camera (4) beside the progress sheets
    // stacked (4), so the two columns end together; the last sheet takes up any slack.
    const right = [
      { key: 'streak', card: streak },
      { key: 'league', card: leagueCard },
      { key: 'exam', card: examCard },
    ].filter((r) => r.card);
    return (
      <>
        {error}
        <TodayOptik goals={goals} />
        <Row>
          <Col span={{ compact: 4, regular: 4 }}>
            <SolvePanel layout="stack" style={fill} />
          </Col>
          <Col span={{ compact: 4, regular: 4 }}>
            {right.map((r, i) => (
              <View key={r.key} style={i === right.length - 1 ? fill : undefined}>
                {r.card}
              </View>
            ))}
          </Col>
        </Row>
      </>
    );
  }

  // Phone: one column.
  return (
    <>
      {error}
      <TodayOptik goals={goals} />
      <SolvePanel layout="phone" />
      <View style={{ gap: theme.spacing.lg }}>
        {streak}
        {leagueCard}
        {examCard}
      </View>
    </>
  );
}

/** "Salı, 13 Ekim. Bugün 3 hedefin var." */
function caption(goals: TodayGoals) {
  const day = dayLine(localToday());
  if (!goals.loaded) return `${day}.`;
  if (goals.remaining === 0) return `${day}. Bugünün optiği tamam.`;
  if (goals.remaining === 3) return `${day}. Bugün 3 hedefin var.`;
  return `${day}. Bugün ${goals.remaining} hedefin kaldı.`;
}

export default function HomeScreen() {
  const name = useAuthStore((s) => s.user?.displayName);
  const goals = useTodayGoals();
  // The demo user ("Sen") gets no name.
  const first = name && name !== 'Sen' ? `, ${name.split(' ')[0]}` : '';
  return (
    <Screen title={`${greeting(new Date().getHours())}${first}`} subtitle={caption(goals)} headerRight={<Countdown />}>
      <HomeContent goals={goals} />
    </Screen>
  );
}
