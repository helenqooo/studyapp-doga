import { useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ChoiceLabel } from '../api/types';
import { haptics } from '../lib/haptics';
import { elevated, useTheme } from '../theme';
import { AppText } from './AppText';
import { PressableScale } from './motion/PressableScale';

const native = Platform.OS !== 'web';

/**
 * The floating answer dock: the next action is always under the thumb, wherever the page
 * is scrolled (reading a hint, the solution). Give it to `Screen`'s `dock`.
 * `note` is a short line above the controls (an error, what happens next).
 */
export function AnswerDock({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={native ? FadeInDown.springify().damping(theme.motion.spring.damping).stiffness(theme.motion.spring.stiffness) : FadeIn}
      layout={native ? LinearTransition.duration(theme.motion.duration.base) : undefined}
      style={[
        elevated(theme, 'floating'),
        {
          borderRadius: theme.radius.xl,
          padding: theme.spacing.sm,
          gap: theme.spacing.xs,
        },
      ]}
    >
      {note ? <View style={{ paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xs }}>{note}</View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.layout.dock - theme.spacing.lg }}>
        {children}
      </View>
    </Animated.View>
  );
}

function Letter({
  label,
  selected,
  sealing,
  disabled,
  onPress,
}: {
  label: ChoiceLabel;
  selected: boolean;
  sealing: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const size = theme.layout.dockLetter;

  useEffect(() => {
    if (reduceMotion) return;
    if (sealing) {
      // Breathes while the answer is graded.
      scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 300 }), withTiming(1, { duration: 300 })), -1);
    } else if (selected) {
      scale.value = withSequence(withTiming(1.14, { duration: theme.motion.duration.fast / 2 }), withSpring(1, theme.motion.springBouncy));
    } else {
      scale.value = withTiming(1, { duration: theme.motion.duration.fast });
    }
  }, [selected, sealing, reduceMotion, scale, theme.motion]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={`${label} şıkkı`}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={(theme.layout.minTouch - size) / 2}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
            borderWidth: theme.layout.borderWidth,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
          },
          style,
        ]}
      >
        <AppText weight="semibold" tint={selected ? theme.colors.textOnAccent : theme.colors.text}>
          {label}
        </AppText>
      </Animated.View>
    </PressableScale>
  );
}

/** Round letter buttons A–E: pick your answer from anywhere on the page. */
export function DockLetters({
  labels,
  selected,
  sealing = false,
  disabled = false,
  onPick,
}: {
  labels: ChoiceLabel[];
  selected: ChoiceLabel | null;
  sealing?: boolean;
  disabled?: boolean;
  onPick: (label: ChoiceLabel) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Şıklar" style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
      {labels.map((l) => (
        <Letter
          key={l}
          label={l}
          selected={selected === l}
          sealing={sealing && selected === l}
          disabled={disabled}
          onPress={() => {
            haptics.select();
            onPick(l);
          }}
        />
      ))}
    </View>
  );
}

/** Small dots for steps used (e.g. hints: ●●○). */
export function Pips({ count, filled, color }: { count: number; filled: number; color: string }) {
  const theme = useTheme();
  const size = theme.layout.pip;
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.xs }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < filled ? color : theme.colors.transparent,
            borderWidth: theme.layout.borderWidth,
            borderColor: color,
          }}
        />
      ))}
    </View>
  );
}

/** A short status line inside the dock: an icon-coloured title, optional XP. */
export function DockStatus({ title, tone, xp }: { title: string; tone: string; xp?: number | null }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, paddingHorizontal: theme.spacing.sm, gap: theme.spacing.xxs }}>
      <AppText weight="semibold" tint={tone} numberOfLines={2}>
        {title}
      </AppText>
      {xp ? (
        <Animated.View entering={FadeIn.delay(theme.motion.duration.slow * 2)}>
          <AppText variant="label" weight="semibold" tint={theme.colors.xpText}>
            +{xp} XP
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}
