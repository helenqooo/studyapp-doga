import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { useProfile, useStudyDay, useStudyDays, useUpdateSettings } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mascot } from '../components/mascot/Mascot';
import { Chip } from '../components/Chip';
import { Columns } from '../components/Grid';
import { Icon } from '../components/Icon';
import { Appear } from '../components/motion/Appear';
import { PressableScale } from '../components/motion/PressableScale';
import { Screen } from '../components/Screen';
import { useStopTimer } from '../components/TimerSupervisor';
import { SUBJECTS_BY_EXAM } from '../data/topics';
import { haptics } from '../lib/haptics';
import { formatClock, formatMinutes, useNow } from '../lib/useNow';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { subjectColor, useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SUBJECTS = [...SUBJECTS_BY_EXAM.TYT, ...SUBJECTS_BY_EXAM.AYT];
const DEFAULT_SETTINGS = { focusMinutes: 25, breakMinutes: 5 };
const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** The countdown ring: the arc shrinks as the phase runs out. */
function Ring({ fraction, color }: { fraction: number; color: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const size = theme.layout.timerRing;
  const stroke = theme.layout.timerStroke;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(fraction);

  useEffect(() => {
    // Glide over the one-second tick so the arc moves continuously.
    progress.value = reduceMotion ? fraction : withTiming(fraction, { duration: 1000, easing: Easing.linear });
  }, [fraction, progress, reduceMotion]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.surfaceAlt} strokeWidth={stroke} fill="none" />
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={props}
        />
      </G>
    </Svg>
  );
}

/** − 25 dk + : minutes for focus or break, saved to the profile. */
function Stepper({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const button = (icon: 'minus' | 'plus', next: number, disabled: boolean) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label} ${icon === 'plus' ? 'artır' : 'azalt'}`}
      disabled={disabled}
      dimmed={disabled}
      onPress={() => {
        haptics.select();
        onChange(next);
      }}
      style={{
        width: theme.layout.minTouch,
        height: theme.layout.minTouch,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={theme.layout.iconSize.sm} color={theme.colors.text} />
    </PressableScale>
  );
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {button('minus', Math.max(min, value - step), value <= min)}
        <AppText variant="heading" style={{ minWidth: theme.layout.minTouch + theme.spacing.md, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {value} dk
        </AppText>
        {button('plus', Math.min(max, value + step), value >= max)}
      </View>
    </View>
  );
}

/** Focus minutes for the last 7 days, today's bar in the accent. */
function WeekBars() {
  const theme = useTheme();
  const days = useStudyDays(7);
  const items = days.data?.days ?? [];
  const height = theme.layout.chart.trendHeight * 0.7;
  const top = theme.spacing.lg;
  const bottom = theme.spacing.xl;
  const width = 7 * 44;
  const max = Math.max(60 * 60, ...items.map((d) => d.focusSec));
  const barW = 22;
  const total = items.reduce((sum, d) => sum + d.focusSec, 0);
  return (
    <Card title="Son 7 gün">
      <AppText color="textMuted">Toplam {formatMinutes(total)} odak.</AppText>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Son 7 günün odak süreleri">
        {items.map((d, i) => {
          const h = ((height - top - bottom) * d.focusSec) / max;
          const x = i * 44 + (44 - barW) / 2;
          const isToday = i === items.length - 1;
          const minutes = Math.round(d.focusSec / 60);
          return (
            <G key={d.date}>
              <Rect
                x={x}
                y={height - bottom - Math.max(h, 2)}
                width={barW}
                height={Math.max(h, 2)}
                rx={theme.layout.chart.barEndRadius}
                fill={isToday ? theme.colors.chart.line : theme.colors.chart.grid}
              />
              {minutes > 0 ? (
                <SvgText x={x + barW / 2} y={height - bottom - h - 6} fontSize={theme.fontSize.xs} fontFamily={theme.fonts.sans.semibold} fill={theme.colors.text} textAnchor="middle">
                  {minutes}
                </SvgText>
              ) : null}
              <SvgText x={x + barW / 2} y={height - theme.spacing.xs} fontSize={theme.fontSize.xs} fontFamily={theme.fonts.sans.regular} fill={theme.colors.chart.axisText} textAnchor="middle">
                {isToday ? 'Bugün' : DAY_NAMES[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </Card>
  );
}

/** Today's focus total and the split by subject. */
function TodayCard() {
  const theme = useTheme();
  const day = useStudyDay();
  const d = day.data;
  const max = Math.max(1, ...(d?.bySubject.map((s) => s.seconds) ?? [1]));
  return (
    <Card title="Bugün">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <AppText variant="display">{d ? formatMinutes(d.focusSec) : '—'}</AppText>
        <AppText color="textMuted">{d ? `${d.pomodoros} pomodoro` : ''}</AppText>
      </View>
      {d && d.bySubject.length ? (
        <View style={{ gap: theme.spacing.sm }}>
          {d.bySubject.map((s) => (
            <View key={s.subject ?? 'genel'} style={{ gap: theme.spacing.xxs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="label">{s.subject ?? 'Genel'}</AppText>
                <AppText variant="label" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatMinutes(s.seconds)}
                </AppText>
              </View>
              <View style={{ height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceAlt }}>
                <View
                  style={{
                    width: `${(s.seconds / max) * 100}%`,
                    height: '100%',
                    borderRadius: theme.radius.pill,
                    backgroundColor: s.subject ? subjectColor(theme, s.subject) : theme.colors.neutral,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <AppText color="textMuted">Bugün henüz odak yok. İlk pomodoroyu başlat.</AppText>
      )}
    </Card>
  );
}

export default function TimerScreen() {
  const theme = useTheme();
  const timer = useTimerStore();
  const profile = useProfile();
  const updateSettings = useUpdateSettings();
  const stop = useStopTimer();
  const settings = profile.data?.settings ?? DEFAULT_SETTINGS;
  const running = timer.phase !== 'idle' && timer.endsAt !== null;
  const now = useNow(running);
  const left = remainingMs(timer, now);
  const paused = timer.phase !== 'idle' && timer.pausedRemainingMs !== null;
  const focus = timer.phase === 'focus';

  const fraction = timer.phase === 'idle' ? 1 : timer.plannedMs ? left / timer.plannedMs : 0;
  const ringColor = timer.phase === 'break' ? theme.colors.success : theme.colors.chart.line;
  const clock = timer.phase === 'idle' ? formatClock(settings.focusMinutes * 60_000) : formatClock(left);
  const eyebrow =
    timer.phase === 'idle'
      ? 'HAZIR'
      : focus
        ? `ODAK${timer.subject ? ` · ${timer.subject.toLocaleUpperCase('tr-TR')}` : ''}`
        : 'MOLA';

  const saveSettings = (next: Partial<typeof settings>) => updateSettings.mutate({ ...settings, ...next });

  const controls =
    timer.phase === 'idle' ? (
      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label="Odağı başlat"
          icon="play"
          size="lg"
          onPress={() => {
            haptics.press();
            timer.start('focus', settings.focusMinutes, timer.subject);
          }}
        />
        <Button label={`${settings.breakMinutes} dk mola ver`} icon="coffee" variant="ghost" onPress={() => timer.start('break', settings.breakMinutes, null)} />
      </View>
    ) : (
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {focus ? (
          <Button
            label={paused ? 'Devam' : 'Duraklat'}
            icon={paused ? 'play' : 'pause'}
            variant="secondary"
            size="lg"
            onPress={() => {
              haptics.tap();
              if (paused) timer.resume();
              else timer.pause();
            }}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          label={focus ? 'Bitir' : 'Molayı atla'}
          icon={focus ? 'square' : 'skip-forward'}
          variant={focus ? 'neutral' : 'secondary'}
          size="lg"
          onPress={() => {
            haptics.press();
            stop();
          }}
          style={{ flex: 1 }}
        />
      </View>
    );

  const timerCard = (
    <Card>
      <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <View style={{ width: theme.layout.timerRing, height: theme.layout.timerRing, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute' }}>
            <Ring fraction={fraction} color={ringColor} />
          </View>
          <Mascot mood={timer.phase === 'focus' ? (paused ? 'sleepy' : 'focus') : timer.phase === 'break' ? 'break' : 'study'} size={theme.layout.mascot.note} />
          <AppText variant="caption" weight="semibold" color={focus ? 'primaryText' : timer.phase === 'break' ? 'success' : 'textMuted'} style={{ letterSpacing: 1.2 }}>
            {eyebrow}
          </AppText>
          <AppText
            family="serif"
            weight="semibold"
            accessibilityLabel={`${clock} kaldı`}
            style={{ fontSize: theme.fontSize.numeral, lineHeight: theme.fontSize.numeral * 1.15, fontVariant: ['tabular-nums'] }}
          >
            {clock}
          </AppText>
          {paused ? (
            <AppText variant="label" color="textMuted">
              Duraklatıldı
            </AppText>
          ) : null}
        </View>
        <View style={{ width: '100%' }}>{controls}</View>
      </View>
    </Card>
  );

  const setup = (
    <Card title="Ders">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
        <Chip label="Genel" selected={!timer.subject} onPress={() => timer.setSubject(null)} />
        {SUBJECTS.map((s) => (
          <Chip key={s} label={s} color={subjectColor(theme, s)} selected={timer.subject === s} onPress={() => timer.setSubject(s)} />
        ))}
      </ScrollView>
      {timer.phase === 'idle' ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Stepper label="Odak" value={settings.focusMinutes} min={5} max={90} step={5} onChange={(v) => saveSettings({ focusMinutes: v })} />
          <Stepper label="Mola" value={settings.breakMinutes} min={1} max={30} step={1} onChange={(v) => saveSettings({ breakMinutes: v })} />
        </View>
      ) : null}
      <AppText variant="caption" color="textMuted">
        5 dakikadan uzun tamamlanan her odak +20 XP kazandırır ve günü seriye sayar. Süre bitince bildirim gelir.
      </AppText>
    </Card>
  );

  return (
    <Screen safeTop={false}>
      <Columns
        ratio={1.05}
        left={
          <>
            <Appear>{timerCard}</Appear>
            <Appear index={1}>{setup}</Appear>
          </>
        }
        right={
          <>
            <Appear index={2}>
              <TodayCard />
            </Appear>
            <Appear index={3}>
              <WeekBars />
            </Appear>
          </>
        }
      />
    </Screen>
  );
}
