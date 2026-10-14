import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useProfile, useStudyDay, useStudyDays, useUpdateSettings } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card, GroupDivider } from '../components/Card';
import { Chip } from '../components/Chip';
import { Col, Row } from '../components/Grid';
import { Icon, type IconName } from '../components/Icon';
import type { MascotMood } from '../components/mascot/Mascot';
import { enter } from '../components/motion/presets';
import { PressableScale } from '../components/motion/PressableScale';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { Section } from '../components/SectionHeader';
import { FocusDim, FocusVignette, type FocusLevel } from '../components/timer/FocusDim';
import { TimerRing } from '../components/timer/TimerRing';
import { WeekBars } from '../components/timer/WeekBars';
import { useStopTimer } from '../components/TimerSupervisor';
import { SUBJECTS_BY_EXAM, type Exam } from '../data/topics';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { formatClock, formatMinutes, useNow } from '../lib/useNow';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { subjectColor, useTheme } from '../theme';


const EXAMS: Exam[] = ['TYT', 'AYT'];
const DEFAULT_SETTINGS = { focusMinutes: 25, breakMinutes: 5 };

/**
 * One row of "Süre": the name on the left, then − value + on the right. The value sits in a
 * fixed slot so the focus and break rows line up; while a phase runs the buttons rest.
 */
function StepperRow({ label, value, min, max, step, disabled, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const { touch, tablet } = useWindowLayout();
  const rowMin = tablet ? theme.layout.group.rowMinHeight.tablet : theme.layout.group.rowMinHeight.compact;
  const button = (icon: 'minus' | 'plus', next: number, off: boolean) => (
    <PressableScale
      kind="bubble"
      accessibilityRole="button"
      accessibilityLabel={`${label} ${icon === 'plus' ? 'artır' : 'azalt'}`}
      accessibilityState={{ disabled: off }}
      disabled={off}
      dimmed={off}
      onPress={() => {
        haptics.select();
        onChange(next);
      }}
      style={{
        width: touch,
        height: touch,
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: rowMin }}>
      <AppText weight="medium" style={{ flex: 1 }}>
        {label}
      </AppText>
      {button('minus', Math.max(min, value - step), disabled || value <= min)}
      <View
        accessible
        accessibilityLabel={`${label} ${value} dakika`}
        style={{ width: touch + theme.spacing.lg, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: theme.spacing.xxs }}
      >
        <AppText variant="numeric">{value}</AppText>
        <AppText variant="caption" color="textMuted">
          dk
        </AppText>
      </View>
      {button('plus', Math.min(max, value + step), disabled || value >= max)}
    </View>
  );
}

/** A 68 pt round control with its caption under it (pause, resume, stop, skip). */
function RoundControl({ icon, label, onPress, primary = false }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const theme = useTheme();
  const size = theme.layout.timer.roundControl;
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
      <PressableScale
        kind="bubble"
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primary ? theme.colors.primary : theme.colors.surfaceAlt,
          boxShadow: primary ? theme.colors.shadow.accent : theme.colors.shadow.none,
        }}
      >
        <Icon name={icon} size={theme.layout.iconSize.lg} color={primary ? theme.colors.onPrimary : theme.colors.text} filled={icon === 'square' || icon === 'play' || icon === 'pause'} />
      </PressableScale>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

/** "Ders": Genel, then the subjects grouped by exam (TYT, AYT). */
function Subjects() {
  const theme = useTheme();
  const subject = useTimerStore((s) => s.subject);
  const setSubject = useTimerStore((s) => s.setSubject);
  const group = (exam: Exam) => (
    <View key={exam} style={{ gap: theme.spacing.xs }}>
      <AppText variant="caption" color="textMuted">
        {exam}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {SUBJECTS_BY_EXAM[exam].map((s) => (
          <Chip key={s} label={s} color={subjectColor(theme, s)} selected={subject === s} onPress={() => setSubject(s)} />
        ))}
      </View>
    </View>
  );
  return (
    <Section title="Ders">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Genel" selected={!subject} onPress={() => setSubject(null)} />
        </View>
        {EXAMS.map(group)}
      </View>
    </Section>
  );
}

/** "Süre": the focus and break steppers in one sheet, and what a focus earns. */
function Durations({ idle, settings, onSettings }: { idle: boolean; settings: typeof DEFAULT_SETTINGS; onSettings: (next: Partial<typeof DEFAULT_SETTINGS>) => void }) {
  const theme = useTheme();
  return (
    <Section title="Süre">
      <Card style={{ paddingVertical: theme.spacing.xs, gap: 0 }}>
        <StepperRow label="Odak" value={settings.focusMinutes} min={5} max={90} step={5} disabled={!idle} onChange={(v) => onSettings({ focusMinutes: v })} />
        <GroupDivider inset={0} />
        <StepperRow label="Mola" value={settings.breakMinutes} min={1} max={30} step={1} disabled={!idle} onChange={(v) => onSettings({ breakMinutes: v })} />
      </Card>
      <AppText variant="caption" color="textMuted">
        5 dakikadan uzun her odak +20 XP kazandırır ve günü seriye sayar.
      </AppText>
    </Section>
  );
}

/** "Bugün", on the paper: today's focus minutes, the pomodoro line, and the split by subject. */
function Today({ focusMinutes }: { focusMinutes: number }) {
  const theme = useTheme();
  const d = useStudyDay().data;
  const minutes = d ? Math.round(d.focusSec / 60) : null;
  const max = Math.max(1, ...(d?.bySubject.map((s) => s.seconds) ?? [1]));
  const line = !d
    ? ''
    : d.pomodoros > 0
      ? `${d.pomodoros} pomodoro tamamladın.`
      : (minutes ?? 0) < focusMinutes
        ? `İlk pomodoroya ${focusMinutes - (minutes ?? 0)} dk kaldı.`
        : 'Bugün henüz tamamlanan pomodoro yok.';
  return (
    <Section title="Bugün">
      <View style={{ gap: theme.spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="stat" color={minutes === null ? 'textMuted' : 'text'}>
            {minutes === null ? '—' : minutes}
          </AppText>
          <AppText variant="label" color="textMuted">
            dk
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {line}
        </AppText>
      </View>
      {d && d.bySubject.length ? (
        <View style={{ gap: theme.spacing.sm }}>
          {d.bySubject.map((s) => (
            <View key={s.subject ?? 'genel'} style={{ gap: theme.spacing.xxs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <AppText variant="label">{s.subject ?? 'Genel'}</AppText>
                <AppText variant="caption" color="textMuted">
                  {formatMinutes(s.seconds)}
                </AppText>
              </View>
              <ProgressBar
                variant="plain"
                progress={s.seconds / max}
                height={theme.spacing.sm}
                color={s.subject ? subjectColor(theme, s.subject) : theme.colors.neutral}
                trackColor={theme.colors.surfaceAlt}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Section>
  );
}

/** "Son 7 gün", on the paper: the week's focus as bars, minutes over each. */
function Week() {
  const days = useStudyDays(7).data?.days ?? [];
  const total = days.reduce((sum, d) => sum + d.focusSec, 0);
  return (
    <Section title="Son 7 gün" caption={`Günlük odak, dakika olarak. Toplam ${formatMinutes(total)}.`}>
      <WeekBars days={days} />
    </Section>
  );
}

export default function TimerScreen() {
  const theme = useTheme();
  const { sizeClass, tablet } = useWindowLayout();
  const timer = useTimerStore();
  const profile = useProfile();
  const updateSettings = useUpdateSettings();
  const stop = useStopTimer();
  const settings = profile.data?.settings ?? DEFAULT_SETTINGS;
  const running = timer.phase !== 'idle' && timer.endsAt !== null;
  const now = useNow(running);
  const left = remainingMs(timer, now);
  const paused = timer.phase !== 'idle' && timer.pausedRemainingMs !== null;
  const idle = timer.phase === 'idle';
  const focus = timer.phase === 'focus';

  const fraction = idle ? 1 : timer.plannedMs ? left / timer.plannedMs : 0;
  const clock = idle ? formatClock(settings.focusMinutes * 60_000) : formatClock(left);
  const minutes = idle ? settings.focusMinutes : Math.round(timer.plannedMs / 60_000);
  const mood: MascotMood = focus ? (paused ? 'sleepy' : 'focus') : timer.phase === 'break' ? 'break' : 'study';
  const level: FocusLevel = focus ? (paused ? 0.5 : 1) : 0;
  const ringSize = theme.layout.timer.ring[sizeClass];
  const numeral = theme.typography.numeral;
  const clockSize = Math.min(tablet ? numeral.sizeTablet : numeral.size, Math.round(ringSize * theme.layout.timer.numeralShare));

  const saveSettings = (next: Partial<typeof settings>) => updateSettings.mutate({ ...settings, ...next });

  const controls = idle ? (
    <Animated.View key="idle" entering={enter({ still: true, duration: theme.motion.duration.base })} style={{ gap: theme.spacing.sm, alignSelf: 'stretch' }}>
      <Button label="Odağı başlat" icon="play" size="lg" onPress={() => timer.start('focus', settings.focusMinutes, timer.subject)} />
      <Button label={`${settings.breakMinutes} dk mola ver`} icon="coffee" variant="ghost" onPress={() => timer.start('break', settings.breakMinutes, null)} />
    </Animated.View>
  ) : (
    // Round buttons with captions: nothing to truncate on a narrow phone.
    <Animated.View
      key="running"
      entering={enter({ still: true, duration: theme.motion.duration.base })}
      style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl }}
    >
      {focus ? (
        <RoundControl
          icon={paused ? 'play' : 'pause'}
          label={paused ? 'Devam' : 'Duraklat'}
          primary
          onPress={() => {
            haptics.tap();
            if (paused) timer.resume();
            else timer.pause();
          }}
        />
      ) : null}
      <RoundControl
        icon={focus ? 'square' : 'skip-forward'}
        label={focus ? 'Bitir' : 'Molayı atla'}
        onPress={() => {
          haptics.press();
          stop();
        }}
      />
    </Animated.View>
  );

  const ringCard = (
    <Card>
      <View style={{ alignItems: 'center', gap: theme.spacing.xl, paddingVertical: theme.spacing.sm }}>
        <TimerRing size={ringSize} phase={timer.phase} fraction={fraction} paused={paused} minutes={minutes} mood={mood}>
          <AppText variant="label" color="textMuted">
            {idle ? 'Hazır' : focus ? 'Odak' : 'Mola'}
          </AppText>
          <AppText variant="numeral" accessibilityLabel={`${clock} kaldı`} style={{ fontSize: clockSize, lineHeight: clockSize }}>
            {clock}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {paused ? 'Duraklatıldı' : focus && timer.subject ? timer.subject : ' '}
          </AppText>
        </TimerRing>
        <View style={{ width: '100%', maxWidth: theme.layout.readableWidth / 2, alignItems: 'center' }}>{controls}</View>
      </View>
    </Card>
  );

  const subjects = <Subjects />;
  const durations = <Durations idle={idle} settings={settings} onSettings={saveSettings} />;
  const today = <Today focusMinutes={settings.focusMinutes} />;
  const week = <Week />;
  const gap = tablet ? theme.layout.screen.gap.tablet : theme.layout.screen.gap.compact;

  // The clock is the one sheet; everything else sits on the paper and steps back while focusing.
  let body: ReactNode;
  if (sizeClass === 'wide') {
    body = (
      <Row>
        <Col span={{ compact: 4, wide: 6 }} style={{ gap }}>
          {ringCard}
          <FocusDim level={level}>{today}</FocusDim>
        </Col>
        <Col span={{ compact: 4, wide: 6 }}>
          <FocusDim level={level} style={{ gap }}>
            {subjects}
            {durations}
            {week}
          </FocusDim>
        </Col>
      </Row>
    );
  } else if (sizeClass === 'regular') {
    body = (
      <>
        {ringCard}
        <FocusDim level={level} style={{ gap }}>
          {subjects}
          <Row>
            <Col span={{ compact: 4, regular: 4 }}>{durations}</Col>
            <Col span={{ compact: 4, regular: 4 }}>{today}</Col>
          </Row>
          {week}
        </FocusDim>
      </>
    );
  } else {
    body = (
      <>
        {ringCard}
        <FocusDim level={level} style={{ gap }}>
          {subjects}
          {durations}
          {today}
          {week}
        </FocusDim>
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen safeTop={false} title="Sayaç" subtitle="Odaklan, sonra kısa bir mola.">
        {body}
      </Screen>
      <FocusVignette level={level} />
    </View>
  );
}
