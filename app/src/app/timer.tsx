import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useProfile, useStudyDay, useStudyDays, useUpdateSettings } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Col, Row } from '../components/Grid';
import { Icon, type IconName } from '../components/Icon';
import type { MascotMood } from '../components/mascot/Mascot';
import { enter } from '../components/motion/presets';
import { PressableScale } from '../components/motion/PressableScale';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { FocusDim, FocusVignette, type FocusLevel } from '../components/timer/FocusDim';
import { TimerRing } from '../components/timer/TimerRing';
import { WeekBars } from '../components/timer/WeekBars';
import { useStopTimer } from '../components/TimerSupervisor';
import { SUBJECTS_BY_EXAM } from '../data/topics';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { formatClock, formatMinutes, useNow } from '../lib/useNow';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { subjectColor, useTheme } from '../theme';

// TOKEN-PENDING: layout.timer.numeralShare = 0.32 (the clock never grows past this share of the ring)
const NUMERAL_SHARE = 0.32;

const SUBJECTS = [...SUBJECTS_BY_EXAM.TYT, ...SUBJECTS_BY_EXAM.AYT];
const DEFAULT_SETTINGS = { focusMinutes: 25, breakMinutes: 5 };

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
      kind="bubble"
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
    <View style={{ flex: 1, minWidth: theme.layout.minTouch * 3, alignItems: 'center', gap: theme.spacing.xs }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {button('minus', Math.max(min, value - step), value <= min)}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: theme.spacing.xxs, minWidth: theme.layout.minTouch + theme.spacing.md }}>
          <AppText variant="numeric">{value}</AppText>
          <AppText variant="caption" color="textMuted">
            dk
          </AppText>
        </View>
        {button('plus', Math.min(max, value + step), value >= max)}
      </View>
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

/** "Ders": subject chips that wrap, and the focus and break steppers while idle. */
function Setup({ idle, settings, onSettings }: { idle: boolean; settings: typeof DEFAULT_SETTINGS; onSettings: (next: Partial<typeof DEFAULT_SETTINGS>) => void }) {
  const theme = useTheme();
  const subject = useTimerStore((s) => s.subject);
  const setSubject = useTimerStore((s) => s.setSubject);
  return (
    <Card title="Ders">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Chip label="Genel" selected={!subject} onPress={() => setSubject(null)} />
        {SUBJECTS.map((s) => (
          <Chip key={s} label={s} color={subjectColor(theme, s)} selected={subject === s} onPress={() => setSubject(s)} />
        ))}
      </View>
      {idle ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, paddingTop: theme.spacing.xs }}>
          <Stepper label="Odak" value={settings.focusMinutes} min={5} max={90} step={5} onChange={(v) => onSettings({ focusMinutes: v })} />
          <Stepper label="Mola" value={settings.breakMinutes} min={1} max={30} step={1} onChange={(v) => onSettings({ breakMinutes: v })} />
        </View>
      ) : null}
      <AppText variant="caption" color="textMuted">
        5 dakikadan uzun tamamlanan her odak +20 XP kazandırır ve günü seriye sayar. Süre bitince bildirim gelir.
      </AppText>
    </Card>
  );
}

/** "Bugün": today's focus minutes, the pomodoro line, and the split by subject. */
function Today({ focusMinutes }: { focusMinutes: number }) {
  const theme = useTheme();
  const d = useStudyDay().data;
  const minutes = d ? Math.round(d.focusSec / 60) : null;
  const max = Math.max(1, ...(d?.bySubject.map((s) => s.seconds) ?? [1]));
  const line = !d
    ? ''
    : d.pomodoros > 0
      ? `Bugün ${d.pomodoros} pomodoro`
      : (minutes ?? 0) < focusMinutes
        ? `İlk pomodoroya ${focusMinutes - (minutes ?? 0)} dk kaldı.`
        : 'Bugün henüz tamamlanan pomodoro yok.';
  return (
    <Card title="Bugün">
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
    </Card>
  );
}

/** "Son 7 gün": the week's focus as bars that fill the sheet. */
function Week() {
  const days = useStudyDays(7).data?.days ?? [];
  const total = days.reduce((sum, d) => sum + d.focusSec, 0);
  return (
    <Card title="Son 7 gün">
      <AppText variant="caption" color="textMuted">
        Toplam {formatMinutes(total)} odak.
      </AppText>
      <WeekBars days={days} />
    </Card>
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
  const clockSize = Math.min(tablet ? numeral.sizeTablet : numeral.size, Math.round(ringSize * NUMERAL_SHARE));

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

  const setup = <Setup idle={idle} settings={settings} onSettings={saveSettings} />;
  const today = <Today focusMinutes={settings.focusMinutes} />;
  const week = <Week />;

  let body: ReactNode;
  if (sizeClass === 'wide') {
    body = (
      <Row>
        <Col span={{ compact: 4, wide: 7 }}>{ringCard}</Col>
        <Col span={{ compact: 4, wide: 5 }}>
          <FocusDim level={level} style={{ gap: theme.spacing.lg }}>
            {setup}
            {today}
            {week}
          </FocusDim>
        </Col>
      </Row>
    );
  } else if (sizeClass === 'regular') {
    body = (
      <>
        {ringCard}
        <FocusDim level={level}>
          <Row>
            <Col span={{ compact: 4, regular: 4 }}>{setup}</Col>
            <Col span={{ compact: 4, regular: 4 }}>
              {today}
              {week}
            </Col>
          </Row>
        </FocusDim>
      </>
    );
  } else {
    body = (
      <>
        {ringCard}
        <FocusDim level={level} style={{ gap: theme.spacing.lg }}>
          {setup}
          {today}
          {week}
        </FocusDim>
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen safeTop={false}>{body}</Screen>
      <FocusVignette level={level} />
    </View>
  );
}
