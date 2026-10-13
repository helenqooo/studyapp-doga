import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import type { IconName } from '../Icon';
import { enter } from '../motion/presets';

interface Props {
  /** The trigger's label (an outline red-pen button), e.g. "Sil". */
  label: string;
  icon?: IconName;
  /** The question in the confirm row, e.g. "Silinsin mi?". */
  question: string;
  /** Defaults to `label`. */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** An error from the last attempt, shown under the row (red pen). */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * A destructive action that asks in place instead of an Alert: the small outline-danger
 * button turns into "Silinsin mi?" with **Sil** / **Vazgeç**. The row fades in (it arrives
 * because of a tap); the trigger fades back on Vazgeç.
 */
export function InlineConfirm({ label, icon = 'trash', question, confirmLabel, cancelLabel = 'Vazgeç', onConfirm, loading = false, error, style }: Props) {
  const theme = useTheme();
  const [asking, setAsking] = useState(false);
  // Once toggled, either side fades in when it takes over (the first render stays still).
  const [touched, setTouched] = useState(false);
  const open = asking || loading;
  const swapIn = touched ? enter({ still: true, duration: theme.motion.duration.base }) : undefined;
  const ask = (v: boolean) => {
    setTouched(true);
    setAsking(v);
  };

  return (
    <View style={[{ gap: theme.spacing.xs }, style]}>
      {open ? (
        <Animated.View
          key="ask"
          entering={swapIn}
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}
        >
          <AppText variant="label" weight="semibold" style={{ flexGrow: 1 }}>
            {question}
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button label={confirmLabel ?? label} icon={icon} variant="danger" size="sm" loading={loading} onPress={onConfirm} />
            <Button label={cancelLabel} variant="ghost" size="sm" disabled={loading} onPress={() => ask(false)} />
          </View>
        </Animated.View>
      ) : (
        <Animated.View key="trigger" entering={swapIn} style={{ alignSelf: 'flex-start' }}>
          <Button label={label} icon={icon} variant="danger" size="sm" onPress={() => ask(true)} />
        </Animated.View>
      )}
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
