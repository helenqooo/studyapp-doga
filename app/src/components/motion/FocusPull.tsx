import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { ease } from './presets';

type AppTextProps = React.ComponentProps<typeof AppText>;

interface Props extends Omit<AppTextProps, 'children' | 'style'> {
  text: string;
  /** Starts the pull. Off: the text simply shows. Turning it on (or mounting with it on) plays once. */
  play: boolean;
  /** Called when the pull has settled. */
  onDone?: () => void;
  /** The wrapper; the pull scales around its center, so let it hug the text. */
  style?: StyleProp<ViewStyle>;
}

/**
 * "Netleşme": a lens finding focus. Two ghost copies, `focusPull.ghostOffset` pt to either
 * side at `opacity.ghost`, converge on the text and fade, while the text itself sharpens
 * from 0.5 opacity / 1.06 scale to 1 / 1 (420 ms, enter easing). At most one per screen.
 * Reduce Motion: none, the text simply shows.
 */
export function FocusPull({ text, play, onDone, variant = 'hero', style, ...textProps }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { focusPull } = theme.motion;
  const still = reduceMotion || !play;
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (!play || reduceMotion) {
      p.value = 1;
      return;
    }
    const done = onDone;
    p.value = 0;
    p.value = withTiming(1, { duration: focusPull.ms, easing: ease('enter') }, (finished) => {
      if (finished && done) runOnJS(done)();
    });
    // Plays when `play` turns on; a new onDone identity must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduceMotion, p, focusPull.ms]);

  const realStyle = useAnimatedStyle(() => ({
    opacity: focusPull.startOpacity + (1 - focusPull.startOpacity) * p.value,
    transform: [{ scale: focusPull.startScale + (1 - focusPull.startScale) * p.value }],
  }));
  const leftStyle = useAnimatedStyle(() => ({
    opacity: focusPull.ghostOpacity * (1 - p.value),
    transform: [{ translateX: -focusPull.ghostOffset * (1 - p.value) }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: focusPull.ghostOpacity * (1 - p.value),
    transform: [{ translateX: focusPull.ghostOffset * (1 - p.value) }],
  }));

  const copy = (
    <AppText {...textProps} variant={variant}>
      {text}
    </AppText>
  );

  return (
    <View style={style}>
      <Animated.View style={realStyle}>{copy}</Animated.View>
      <Animated.View
        pointerEvents="none"
        aria-hidden
        style={[StyleSheet.absoluteFill, leftStyle]}
      >
        {copy}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        aria-hidden
        style={[StyleSheet.absoluteFill, rightStyle]}
      >
        {copy}
      </Animated.View>
    </View>
  );
}
