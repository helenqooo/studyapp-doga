import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed; defaults to the theme's press scale. */
  scaleTo?: number;
}

/** Pressable that sinks slightly under the finger and springs back. */
export function PressableScale({ children, style, scaleTo, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const target = scaleTo ?? theme.motion.pressScale;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - target) * pressed.value }],
    opacity: 1 - 0.12 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = reduceMotion ? withTiming(0.4, { duration: theme.motion.duration.fast }) : withSpring(1, theme.motion.spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduceMotion ? withTiming(0, { duration: theme.motion.duration.fast }) : withSpring(0, theme.motion.spring);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
