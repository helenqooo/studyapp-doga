import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { elevated, useTheme } from '../theme';
import { FadeText } from './motion/FadeText';
import { PressableScale } from './motion/PressableScale';
import { spring } from './motion/presets';


interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * Stretch across the whole width on a tablet too. By default a tablet's control hugs its
   * labels (equal segments, at most `layout.segmented.maxWidth`), left-aligned under the title;
   * a phone's always fills the row.
   */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

type Slot = { x: number; w: number };

/**
 * A row of options on a `surfaceAlt` track (44 pt on a phone, 48 on a tablet). The chosen one
 * sits on a raised paper thumb that slides over measured widths with `springs.thumb` (under
 * Reduce Motion it cross-fades in place); labels cross-fade between the chosen look
 * (semibold `primaryText`) and the rest (medium `textMuted`).
 */
export function SegmentedControl<T extends string>({ options, value, onChange, fill = false, style }: Props<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { tablet, touch } = useWindowLayout();
  const hug = tablet && !fill;
  const inset = theme.spacing.xs;
  const seg = theme.layout.segmented;
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  // The width the parent gives: a hugging control never grows past it (or past maxWidth).
  const [avail, setAvail] = useState(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const placed = useSharedValue(0);

  // Hugging: every segment takes the widest label's width, so the control reads as one even row.
  const cap = avail > 0 ? Math.min(avail, seg.maxWidth) : seg.maxWidth;
  const widest = Math.max(0, ...options.map((o) => slots[o.value]?.w ?? 0));
  const share = Math.floor((cap - inset * 2) / Math.max(1, options.length));
  const even = hug ? Math.min(Math.max(widest, seg.minSegment.tablet), share) : 0;

  const slot = slots[value];
  useEffect(() => {
    if (!slot) return;
    // The first placement jumps; Reduce Motion fades the thumb out and back in at the new place.
    if (placed.value === 0) {
      x.value = slot.x;
      w.value = slot.w;
      placed.value = 1;
      return;
    }
    if (reduceMotion) {
      const never = { reduceMotion: ReduceMotion.Never };
      placed.value = withTiming(0, { duration: theme.motion.duration.rmFade / 2, ...never }, () => {
        x.value = slot.x;
        w.value = slot.w;
        placed.value = withTiming(1, { duration: theme.motion.duration.rmFade / 2, ...never });
      });
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

  // Light: a paper thumb raised off the track. Dark paper sits below the track, so the thumb
  // takes the soft clay tone there instead.
  const raised = elevated(theme, 'raised');
  const thumb: ViewStyle =
    theme.scheme === 'dark'
      ? { backgroundColor: theme.colors.primarySoft, borderWidth: theme.layout.borderWidth, borderColor: theme.colors.border }
      : { backgroundColor: raised.backgroundColor, borderWidth: raised.borderWidth, borderColor: raised.borderColor, boxShadow: theme.colors.shadow.card };

  return (
    <View style={style} onLayout={hug ? (e: LayoutChangeEvent) => setAvail(Math.floor(e.nativeEvent.layout.width)) : undefined}>
      <View
        accessibilityRole="tablist"
        style={[
          {
            flexDirection: 'row',
            minHeight: touch,
            padding: inset,
            borderRadius: theme.radius.pill,
            borderCurve: 'continuous',
            backgroundColor: theme.colors.surfaceAlt,
          },
          hug ? { alignSelf: 'flex-start', maxWidth: cap } : null,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, top: inset, bottom: inset, borderRadius: theme.radius.pill, borderCurve: 'continuous' }, thumb, thumbStyle]}
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
              style={[
                {
                  minHeight: touch - inset * 2,
                  paddingHorizontal: hug ? theme.spacing.lg : theme.spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.pill,
                },
                // Natural width between the even width and an equal share of the room, so the
                // widest label is measured and the row never runs past its parent.
                hug ? { minWidth: even, maxWidth: share } : { flex: 1, minWidth: seg.minSegment.compact },
              ]}
            >
              <FadeText variant="label" tint={active ? theme.colors.primaryText : theme.colors.textMuted} weight={active ? 'semibold' : 'medium'} numberOfLines={1}>
                {o.label}
              </FadeText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
