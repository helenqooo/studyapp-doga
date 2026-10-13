import { View, type StyleProp, type ViewStyle } from 'react-native';
import { formatNet } from '../../lib/format';
import { subjectColor, useTheme } from '../../theme';

interface Props {
  sections: { subject: string; net: number }[];
  /** The full exam's question count (120 / 80), so TYT and AYT strips share one scale. */
  max: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The karne in one line: per-subject segments in subject ink, stacked left to right over an
 * `optikSoft` track, each as wide as its net's share of the whole exam. A negative net takes
 * no room. Static: the shape is the information.
 */
export function NetStrip({ sections, max, height, style }: Props) {
  const theme = useTheme();
  const h = height ?? theme.layout.progressHeight;
  const total = sections.reduce((sum, s) => sum + Math.max(0, s.net), 0);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Net şeridi: ${sections.map((s) => `${s.subject} ${formatNet(s.net)}`).join(', ')}`}
      style={[
        {
          height: h,
          flexDirection: 'row',
          borderRadius: theme.radius.pill,
          borderCurve: 'continuous',
          backgroundColor: theme.colors.optikSoft,
          overflow: 'hidden',
          gap: theme.layout.system.borderWidth,
        },
        style,
      ]}
    >
      {sections.map((s) =>
        s.net > 0 ? (
          <View key={s.subject} style={{ width: `${(s.net / Math.max(max, total, 1)) * 100}%`, backgroundColor: subjectColor(theme, s.subject) }} />
        ) : null,
      )}
    </View>
  );
}
