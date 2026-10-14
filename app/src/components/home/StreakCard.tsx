import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';
import { useProfile, useStudyDays } from '../../api/hooks';
import { localToday, shiftDate } from '../../lib/format';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { ease } from '../motion/presets';
import { ProgressBar } from '../ProgressBar';
import { StreakFlame } from '../StreakFlame';
import { weekdayShort } from './dates';
import { Highlight } from '../Highlight';


/** A dot bubble's streak-orange ring: today, until it counts (then it fades out). */
function TodayRing({ shown }: { shown: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { w, h } = theme.layout.bubble.dot;
  const s = theme.layout.system.selectedBorder;
  const opacity = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    opacity.value = withTiming(shown ? 1 : 0, {
      duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [shown, reduceMotion, opacity, theme.motion.duration.base]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -s, top: -s }, fade]}>
      <Svg width={w + s * 2} height={h + s * 2}>
        <Ellipse cx={w / 2 + s} cy={h / 2 + s} rx={w / 2 + s / 2} ry={h / 2 + s / 2} stroke={theme.colors.streak} strokeWidth={s} fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** The last seven days as dot bubbles: studied days filled, today ringed until it counts. */
function WeekDots({ studied, todayCounts }: { studied: boolean[]; todayCounts: boolean }) {
  const theme = useTheme();
  const today = localToday();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {studied.map((on, i) => {
        const date = shiftDate(today, i - 6);
        const isToday = i === 6;
        return (
          <View key={date} style={{ alignItems: 'center', gap: theme.spacing.xxs }} accessibilityLabel={`${weekdayShort(date)}: ${on ? 'çalışıldı' : 'boş'}`}>
            <View>
              <Bubble size="dot" filled={on} />
              {isToday ? <TodayRing shown={!todayCounts} /> : null}
            </View>
            <AppText variant="caption" color={isToday ? 'text' : 'textMuted'} weight={isToday ? 'semibold' : undefined}>
              {weekdayShort(date)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** Seri: the flame and the streak, the week as bubbles, then the level and its XP groove. */
export function StreakSection() {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const p = useProfile().data;
  const days = useStudyDays(7).data;
  const streak = p?.streak ?? 0;
  const today = localToday();

  // A day counts if it had focus time or sits inside the current streak.
  const streakEnd = p?.streakToday ? 0 : -1;
  const studied = Array.from({ length: 7 }, (_, i) => {
    const offset = i - 6;
    const date = shiftDate(today, offset);
    const focus = days?.days.find((d) => d.date === date)?.focusSec ?? 0;
    const inStreak = streak > 0 && offset <= streakEnd && offset > streakEnd - streak;
    return focus > 0 || inStreak;
  });
  const todayCounts = !!p?.streakToday;
  const statSize = tablet ? theme.typography.stat.sizeTablet : theme.typography.stat.size;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <StreakFlame active={streak > 0} streak={streak} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, flexShrink: 1 }}>
          <Highlight id="home.seri">
            <AppText variant="stat">{String(streak)}</AppText>
          </Highlight>
          <AppText variant="label" color="textMuted" style={{ flexShrink: 1, marginBottom: Math.round(statSize * theme.typography.figureDrop) }}>
            günlük seri
          </AppText>
        </View>
      </View>
      <WeekDots studied={studied} todayCounts={todayCounts} />
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.spacing.sm }}>
          <AppText variant="heading">Seviye {p?.level ?? 1}</AppText>
          {/* Written as on Profile: the figures, then a small "XP". */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
            <Highlight id="home.xp">
              <AppText variant="numeric" color="textMuted">
                {p ? `${p.levelXp}/${p.levelXpRequired}` : '—'}
              </AppText>
            </Highlight>
            <AppText variant="caption" color="textMuted">
              XP
            </AppText>
          </View>
        </View>
        <ProgressBar variant="groove" progress={p ? p.levelXp / p.levelXpRequired : 0} />
      </View>
    </View>
  );
}
