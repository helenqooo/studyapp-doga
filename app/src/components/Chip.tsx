import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme, type Theme } from '../theme';
import { Icon, type IconName } from './Icon';
import { FadeText } from './motion/FadeText';
import { PressableScale } from './motion/PressableScale';
import { ease } from './motion/presets';


interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Raw subject ink. Selected, the chip fills with that subject's soft tint and gets a 1.5 pt ink border; text stays in the text color. */
  color?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** The soft tint that belongs to a subject ink, when `color` is one of the theme's subject inks. */
function softFor(theme: Theme, ink: string): string | undefined {
  const { subject, subjectSoft } = theme.colors;
  const key = (Object.keys(subject) as (keyof typeof subject)[]).find((k) => subject[k] === ink);
  return key ? subjectSoft[key] : undefined;
}

/**
 * Tappable filter / suggestion pill, 44 pt tall on a phone and 48 on a tablet, its label in
 * `label` (16 on a tablet). Selection is always a fill (graphite, or the subject's tint).
 */
export function Chip({ label, selected = false, onPress, color, icon, style }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { touch, tablet } = useWindowLayout();
  const c = theme.colors;
  const { borderWidth, selectedBorder } = theme.layout.system;
  const neutralFill = selected && !color;
  const fg = neutralFill ? c.markInk : c.text;
  const bg = neutralFill ? c.mark : selected ? (softFor(theme, color!) ?? c.surfaceAlt) : c.surface;
  const border = selected ? (color ?? c.mark) : c.border;

  const fade = { duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const colorStyle = useAnimatedStyle(
    () => ({ backgroundColor: withTiming(bg, fade), borderColor: withTiming(border, fade) }),
    [bg, border, reduceMotion],
  );

  return (
    <PressableScale
      kind="bubble"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tablet ? theme.spacing.sm : theme.spacing.xs,
          minHeight: touch,
          paddingHorizontal: tablet ? theme.spacing.lg : theme.spacing.md,
          borderRadius: theme.radius.pill,
          borderCurve: 'continuous',
          // The selected border is thicker; padding absorbs the difference so the label holds still.
          borderWidth: selected && color ? selectedBorder : borderWidth,
          marginHorizontal: selected && color ? borderWidth - selectedBorder : 0,
        },
        // PressableScale is an Animated pressable; its prop type just doesn't say so.
        colorStyle as unknown as ViewStyle,
        style,
      ]}
    >
      {color ? <View style={{ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: color }} /> : null}
      {icon ? <Icon name={icon} size={theme.layout.system.iconSize[tablet ? 'md' : 'sm']} color={fg} /> : null}
      <FadeText variant="label" tint={fg} weight={selected ? 'semibold' : 'medium'}>
        {label}
      </FadeText>
    </PressableScale>
  );
}
