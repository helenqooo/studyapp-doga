import { router, usePathname } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock, useNow } from '../lib/useNow';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';

/** Small floating countdown while a pomodoro runs; tapping it opens the timer. */
export function TimerPill() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const timer = useTimerStore();
  const running = timer.phase !== 'idle' && timer.endsAt !== null;
  const now = useNow(running);

  const hidden = timer.phase === 'idle' || pathname === '/timer' || pathname === '/camera' || pathname === '/crop';
  if (hidden) return null;

  const focus = timer.phase === 'focus';
  const paused = timer.pausedRemainingMs !== null;
  return (
    <Animated.View
      entering={FadeIn.duration(theme.motion.duration.base)}
      exiting={FadeOut.duration(theme.motion.duration.fast)}
      style={{ position: 'absolute', top: insets.top + theme.spacing.xs, right: theme.spacing.lg }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${focus ? 'Odak' : 'Mola'}: ${formatClock(remainingMs(timer, now))} kaldı. Sayacı aç.`}
        onPress={() => router.push('/timer')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          minHeight: theme.layout.minTouch - theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          backgroundColor: focus ? theme.colors.primary : theme.colors.successStrong,
        }}
      >
        <Icon name={paused ? 'pause' : focus ? 'timer' : 'coffee'} size={theme.layout.iconSize.sm} color={theme.colors.textOnAccent} />
        <AppText variant="label" weight="semibold" tint={theme.colors.textOnAccent} style={{ fontVariant: ['tabular-nums'] }}>
          {formatClock(remainingMs(timer, now))}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}
