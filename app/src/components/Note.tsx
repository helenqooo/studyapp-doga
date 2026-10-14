import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useWindowLayout } from '../lib/layout';
import { elevated, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';
import { spring } from './motion/presets';

interface Props {
  title?: string;
  /** A string is set in the `note` type style in `noteInk`. */
  children: ReactNode;
  /** One small graphite button under the text. */
  action?: { label: string; onPress: () => void };
  /** Shows a close × (44 pt hit area) in the top-right corner. */
  onClose?: () => void;
  /** The slight paper tilt (default true); it straightens while pressed. */
  tilt?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lumi's sticky note: note paper with a lifted bottom-right corner and a soft shadow, turned
 * −1.2°. Pressing anywhere on it straightens it (springs.note). Text is always `noteInk`.
 */
export function Note({ title, children, action, onClose, tilt = true, style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const c = theme.colors;
  const { touch: minTouch } = useWindowLayout();
  const { iconSize } = theme.layout.system;
  const rest = tilt ? theme.layout.note.tiltDeg : 0;
  const angle = useSharedValue(rest);
  const straighten = (on: boolean) => {
    if (reduceMotion || !tilt) return;
    angle.value = withSpring(on ? 0 : rest, spring('note'));
  };
  const tiltStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  const closeInset = (minTouch - iconSize.sm) / 2;

  return (
    <Animated.View style={[elevated(theme, 'note'), { padding: theme.layout.note.padding, gap: theme.spacing.sm }, tiltStyle, style]}>
      <Pressable
        accessible={false}
        onPressIn={() => straighten(true)}
        onPressOut={() => straighten(false)}
        style={{ gap: theme.spacing.sm, paddingRight: onClose ? minTouch - closeInset : 0 }}
      >
        {title ? (
          <AppText variant="label" weight="semibold" tint={c.noteInk}>
            {title}
          </AppText>
        ) : null}
        {typeof children === 'string' || typeof children === 'number' ? (
          <AppText variant="note" tint={c.noteInk}>
            {children}
          </AppText>
        ) : (
          children
        )}
      </Pressable>
      {action ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPressIn={() => straighten(true)}
          onPressOut={() => straighten(false)}
          onPress={action.onPress}
          style={{
            alignSelf: 'flex-start',
            minHeight: minTouch,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.button,
            borderCurve: 'continuous',
            backgroundColor: c.mark,
          }}
        >
          <AppText variant="label" weight="semibold" tint={c.markInk} numberOfLines={1}>
            {action.label}
          </AppText>
        </PressableScale>
      ) : null}
      {onClose ? (
        <View style={{ position: 'absolute', top: 0, right: 0 }}>
          <PressableScale
            kind="bubble"
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            onPress={onClose}
            style={{ width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={iconSize.sm} color={c.noteInk} />
          </PressableScale>
        </View>
      ) : null}
    </Animated.View>
  );
}
