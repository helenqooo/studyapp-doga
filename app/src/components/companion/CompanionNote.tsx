import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { CompanionLine } from '../../store/companionStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { ease, spring } from '../motion/presets';
import { Note } from '../Note';

/** Where the note sits, in window coordinates (one horizontal and one vertical anchor). */
export type NotePlacement = { left?: number; right?: number; top?: number; bottom?: number; maxWidth: number };

interface Props {
  /** The line to show; null peels the note away. */
  line: CompanionLine | null;
  placement: NotePlacement;
  onClose: () => void;
  onAction: (line: CompanionLine) => void;
  /** snooze.ask: "Sessiz ol" and "Kalsın". */
  onSnooze: () => void;
  /** Touching the note pauses its timer. */
  onHold: (held: boolean) => void;
  /** Called once the peel has finished (after `line` became null). */
  onGone: () => void;
}

/**
 * Lumi's floating sticky note (spec 6.5): enters with scale 0.92 → 1 and a turn from −4° to
 * the paper's −1.2° (springs.note); leaves by peeling (+6°, an 8 pt rise and a fade, 220 ms).
 * Reduce Motion: a 160 ms fade. Announced once to VoiceOver.
 */
export function CompanionNote({ line, placement, onClose, onAction, onSnooze, onHold, onGone }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const t = theme.motion.companion;
  // The note on screen and where it stands; it keeps its spot while it peels, so a new line
  // from another place never makes the old note jump.
  const [shown, setShown] = useState<{ line: CompanionLine; at: NotePlacement } | null>(null);
  const enter = useSharedValue(0);
  const peel = useSharedValue(0);
  const announced = useRef<string | null>(null);
  const latest = useRef({ placement, onGone });
  latest.current = { placement, onGone };
  const peelMs = reduceMotion ? t.rmFadeMs : t.notePeelMs;

  useEffect(() => {
    const show = (l: CompanionLine) => {
      setShown({ line: l, at: latest.current.placement });
      peel.value = 0;
      enter.value = 0;
      enter.value = reduceMotion
        ? withTiming(1, { duration: t.rmFadeMs, reduceMotion: ReduceMotion.Never })
        : withSpring(1, spring('note'));
      if (announced.current !== l.id) {
        announced.current = l.id;
        AccessibilityInfo.announceForAccessibility(l.title ? `${l.title} ${l.text}` : l.text);
      }
    };
    if (line && !shown) {
      show(line);
      return;
    }
    if (line && shown && shown.line.id === line.id) {
      // The same line back while it was peeling: the peel turns around.
      if (peel.value > 0) peel.value = withTiming(0, { duration: peel.value * peelMs, easing: ease('enter'), reduceMotion: ReduceMotion.Never });
      return;
    }
    if (!shown) return;
    // Peel what is up (from wherever an interrupted peel got to), then show the next line or go.
    const left = Math.max(0, 1 - peel.value) * peelMs;
    peel.value = withTiming(1, { duration: left, easing: ease('exit'), reduceMotion: ReduceMotion.Never });
    const id = setTimeout(() => {
      if (line) show(line);
      else {
        setShown(null);
        latest.current.onGone();
      }
    }, left);
    return () => clearTimeout(id);
    // `shown` is the note being peeled; only a new `line` restarts this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  // The same line follows its spot (a rotation, a re-measured perch).
  useEffect(() => {
    setShown((s) => (s && line && s.line.id === line.id && s.at !== placement ? { ...s, at: placement } : s));
  }, [placement, line]);

  const { noteFromScale, noteFromDeg, notePeelDeg, notePeelRise } = t;
  const rest = theme.layout.note.tiltDeg;
  const style = useAnimatedStyle(() => {
    const e = enter.value;
    const q = peel.value;
    if (reduceMotion) return { opacity: Math.min(e, 1 - q) };
    // Note tilts itself by `rest`; this wrapper adds the entry turn and the peel.
    const turn = (noteFromDeg - rest) * (1 - e) + notePeelDeg * q;
    return {
      opacity: Math.min(1, e * 2) * (1 - q),
      transform: [{ translateY: -notePeelRise * q }, { rotate: `${turn}deg` }, { scale: noteFromScale + (1 - noteFromScale) * e }],
    };
  });

  if (!shown) return null;
  const note = shown.line;
  const snooze = note.id === 'snooze.ask';
  const pos: ViewStyle = { position: 'absolute', ...shown.at, zIndex: theme.layout.z.companionNote };

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[pos, style]}
      onTouchStart={() => onHold(true)}
      onTouchEnd={() => onHold(false)}
      onTouchCancel={() => onHold(false)}
    >
      <Note
        title={note.title}
        onClose={onClose}
        action={!snooze && note.action ? { label: note.action.label, onPress: () => onAction(note) } : undefined}
      >
        {snooze ? (
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="note" tint={theme.colors.noteInk}>
              {note.text}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <Button label="Sessiz ol" size="sm" onPress={onSnooze} />
              <Button label="Kalsın" size="sm" variant="secondary" onPress={onClose} />
            </View>
          </View>
        ) : (
          note.text
        )}
      </Note>
    </Animated.View>
  );
}
