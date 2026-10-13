import { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCompanionStore } from '../../store/companionStore';
import { useTheme } from '../../theme';
import { Mascot, type MascotMood } from '../mascot/Mascot';

interface Props {
  /** Perch id, e.g. "home-note" or "timer-ring". */
  id: string;
  /** Lumi's size here; defaults to the companion size (44 phone, 56 tablet). */
  size?: number;
  /** The mood of the still Lumi drawn in place when the companion doesn't land here. */
  fallbackMood?: MascotMood;
}

/**
 * A spot Lumi can stand on. It reserves Lumi's square in the layout, measures itself in
 * window coordinates (plus the focused screen's scroll offset, so the companion can follow
 * the scroll) and registers as a perch. If the companion hasn't landed on it shortly after
 * mounting (companion off, hidden, or measuring failed on web), it draws its own still Lumi.
 */
export function CompanionPerch({ id, size, fallbackMood = 'idle' }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const tablet = width >= theme.breakpoints.window.tablet;
  const s = size ?? (tablet ? theme.layout.companion.size.tablet : theme.layout.companion.size.compact);
  const ref = useRef<View>(null);
  const occupied = useCompanionStore((st) => st.occupiedPerch === id);
  const [waited, setWaited] = useState(false);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      // Unmounted, or not laid out yet: keep the previous rect (or none, so the fallback shows).
      if (!w || !h) return;
      const store = useCompanionStore.getState();
      const scroll = store.activeScroll;
      store.registerPerch(id, { x, y, w, h, scrollAt: scroll ? scroll.value : 0, anchored: !!scroll });
    });
  }, [id]);

  // Rotation and split view move the perch without a layout change of its own.
  useEffect(() => {
    measure();
  }, [measure, width, height]);

  useEffect(() => () => useCompanionStore.getState().unregisterPerch(id), [id]);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), theme.motion.companion.perchFallbackMs);
    return () => clearTimeout(t);
  }, [theme.motion.companion.perchFallbackMs]);

  return (
    <View ref={ref} onLayout={measure} pointerEvents="box-none" style={{ width: s, height: s }}>
      {waited && !occupied ? (
        <Animated.View entering={FadeIn.duration(theme.motion.companion.rmFadeMs)}>
          <Mascot mood={fallbackMood} size={s} still interactive={false} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Call from any in-tree Lumi (MascotNote, EmptyState, ErrorState): while it is mounted the
 * companion steps aside, so there is one Lumi per screen.
 */
export function useCompanionYield(active = true) {
  useEffect(() => {
    if (!active) return;
    return useCompanionStore.getState().yieldTo();
  }, [active]);
}
