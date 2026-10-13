import { router, usePathname } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowLayout } from '../lib/layout';
import { formatClock, useNow } from '../lib/useNow';
import { remainingMs, useTimerStore } from '../store/timerStore';
import { elevated, useTheme } from '../theme';
import { PressableScale } from './motion/PressableScale';
import { enter, exit } from './motion/presets';
import { TimerFace } from './TabBar';

// TOKEN-PENDING: layout.timerPill.top = 52 (below the nav bar, so it never covers headerRight)
const PILL_TOP = 52;

/** Tab routes show the timer ear on the strip instead; these full-attention routes show nothing. */
const HIDDEN = new Set(['/', '/solve', '/review', '/exams', '/profile', '/timer', '/camera', '/crop']);

/** Small floating countdown on stack screens while a pomodoro runs; tapping it opens the timer. */
export function TimerPill() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { margin } = useWindowLayout();
  const pathname = usePathname();
  const timer = useTimerStore();
  const running = timer.phase !== 'idle' && timer.endsAt !== null;
  const now = useNow(running);

  if (timer.phase === 'idle' || HIDDEN.has(pathname)) return null;

  const focus = timer.phase === 'focus';
  return (
    <Animated.View
      entering={enter({ duration: theme.motion.duration.base })}
      exiting={exit(theme.motion.duration.fast)}
      style={{ position: 'absolute', top: insets.top + PILL_TOP, right: margin, zIndex: theme.layout.z.timerPill }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${focus ? 'Odak' : 'Mola'}: ${formatClock(remainingMs(timer, now))} kaldı. Sayacı aç.`}
        onPress={() => router.push('/timer')}
        style={{
          ...elevated(theme, 'floating'),
          minHeight: theme.layout.minTouch,
          minWidth: theme.layout.tabBar.ear.minWidth,
          paddingHorizontal: theme.spacing.sm,
          justifyContent: 'center',
        }}
      >
        <TimerFace />
      </PressableScale>
    </Animated.View>
  );
}
