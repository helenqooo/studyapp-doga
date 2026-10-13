import { useEffect, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme, type FontWeightName } from '../../theme';
import { AppText } from '../AppText';
import { ease } from './presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;

type Props = Omit<ComponentProps<typeof AppText>, 'tint' | 'weight' | 'color'> & {
  /** Raw token value for the text color. */
  tint: string;
  weight?: FontWeightName;
};

/**
 * AppText whose color (and weight) change cross-fades instead of cutting (client rule 0.7):
 * the previous look is laid over the new one and fades out over `duration.base`
 * (120 ms under Reduce Motion). Nothing animates on mount.
 */
export function FadeText({ tint, weight, style, ...rest }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [look, setLook] = useState({ tint, weight, prevTint: null as string | null, prevWeight: undefined as FontWeightName | undefined });
  const old = useSharedValue(0);

  // Adjust state during render when the look changes (no extra frame with the wrong color).
  if (look.tint !== tint || look.weight !== weight) {
    setLook({ tint, weight, prevTint: look.tint, prevWeight: look.weight });
  }

  useEffect(() => {
    if (look.prevTint === null) return;
    old.value = 1;
    old.value = withTiming(0, {
      duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [look, old, reduceMotion, theme.motion.duration.base]);

  const oldStyle = useAnimatedStyle(() => ({ opacity: old.value }));

  return (
    <View>
      <AppText {...rest} tint={look.tint} weight={look.weight} style={style} />
      {look.prevTint !== null ? (
        <Animated.View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, oldStyle]}>
          <AppText {...rest} tint={look.prevTint} weight={look.prevWeight} style={style} accessible={false} />
        </Animated.View>
      ) : null}
    </View>
  );
}
