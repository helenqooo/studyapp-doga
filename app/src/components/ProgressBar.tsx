import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  /** 0..1 */
  progress: number;
  /** Raw color token values; default to the XP colors. */
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, color, trackColor, height, style }: Props) {
  const theme = useTheme();
  const h = height ?? theme.layout.progressHeight;
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[
        { height: h, borderRadius: theme.radius.pill, backgroundColor: trackColor ?? theme.colors.xpTrack, overflow: 'hidden' },
        style,
      ]}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: theme.radius.pill, backgroundColor: color ?? theme.colors.xp }} />
    </View>
  );
}
