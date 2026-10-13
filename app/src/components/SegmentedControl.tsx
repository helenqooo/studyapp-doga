import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { FadeText } from './motion/FadeText';
import { PressableScale } from './motion/PressableScale';
import { spring } from './motion/presets';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

type Slot = { x: number; w: number };

/**
 * A row of options on a 44 pt `surfaceAlt` track. The chosen one sits in a graphite pill
 * (the filled bubble) that slides over measured widths with `springs.thumb`; under Reduce
 * Motion it jumps. Labels cross-fade between active (semibold markInk) and inactive.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { minTouch } = theme.layout.system;
  const inset = theme.spacing.xs;
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const placed = useSharedValue(0);

  const slot = slots[value];
  useEffect(() => {
    if (!slot) return;
    // The first placement (and Reduce Motion) jumps; later changes slide.
    if (reduceMotion || placed.value === 0) {
      x.value = slot.x;
      w.value = slot.w;
      placed.value = 1;
      return;
    }
    x.value = withSpring(slot.x, spring('thumb'));
    w.value = withSpring(slot.w, spring('thumb'));
  }, [slot?.x, slot?.w, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value, opacity: placed.value }));

  const onSlotLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: sx, width: sw } = e.nativeEvent.layout;
    const prev = slots[key];
    if (prev && prev.x === sx && prev.w === sw) return;
    setSlots((s) => ({ ...s, [key]: { x: sx, w: sw } }));
  };

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        minHeight: minTouch,
        padding: inset,
        borderRadius: theme.radius.pill,
        borderCurve: 'continuous',
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, top: inset, bottom: inset, borderRadius: theme.radius.pill, borderCurve: 'continuous', backgroundColor: theme.colors.mark },
          thumbStyle,
        ]}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            kind="bubble"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={inset}
            onLayout={onSlotLayout(o.value)}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: minTouch - inset * 2,
              paddingHorizontal: theme.spacing.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
            }}
          >
            <FadeText variant="label" tint={active ? theme.colors.markInk : theme.colors.textMuted} weight={active ? 'semibold' : 'medium'} numberOfLines={1}>
              {o.label}
            </FadeText>
          </PressableScale>
        );
      })}
    </View>
  );
}
