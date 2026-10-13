import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { font, useTheme, type ColorTokens, type FontKind, type FontWeightName, type Theme } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'eyebrow';
type ColorName = Exclude<keyof ColorTokens, 'subject' | 'chart' | 'confetti' | 'celebrationScrim' | 'badge' | 'avatar' | 'mascot' | 'shadow' | 'exam' | 'rings'>;

interface Props extends TextProps {
  variant?: Variant;
  color?: ColorName;
  /** Overrides `color` with a raw token value (e.g. a subject color from the theme). */
  tint?: string;
  weight?: FontWeightName;
  /** Overrides the variant's family (e.g. a serif number inside a sans row). */
  family?: FontKind;
  align?: TextStyle['textAlign'];
}

const VARIANTS: Record<Variant, { kind: FontKind; weight: FontWeightName }> = {
  // Titles speak in the serif, like Claude's own writing; the interface uses the sans.
  display: { kind: 'serif', weight: 'semibold' },
  title: { kind: 'serif', weight: 'semibold' },
  heading: { kind: 'sans', weight: 'semibold' },
  body: { kind: 'sans', weight: 'regular' },
  label: { kind: 'sans', weight: 'medium' },
  caption: { kind: 'sans', weight: 'regular' },
  // Pass text already in capitals (upperTr): textTransform would turn "i" into "I", not "İ".
  eyebrow: { kind: 'sans', weight: 'semibold' },
};

function sizeStyle(theme: Theme, variant: Variant): TextStyle {
  const { fontSize, letterSpacing } = theme;
  switch (variant) {
    case 'display':
      return { fontSize: fontSize.display, letterSpacing: letterSpacing.display };
    case 'title':
      return { fontSize: fontSize.xxl, letterSpacing: letterSpacing.title };
    case 'heading':
      return { fontSize: fontSize.lg };
    case 'label':
      return { fontSize: fontSize.sm };
    case 'caption':
      return { fontSize: fontSize.xs };
    case 'eyebrow':
      return { fontSize: fontSize.xs, letterSpacing: letterSpacing.eyebrow };
    case 'body':
    default:
      return { fontSize: fontSize.md };
  }
}

export function AppText({ variant = 'body', color = 'text', tint, weight, family, align, style, ...rest }: Props) {
  const theme = useTheme();
  const base = VARIANTS[variant];
  const size = sizeStyle(theme, variant);
  // Every style has a line height; a size override keeps the style's proportion.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const lineHeight = flat?.lineHeight ?? Math.round((flat?.fontSize ?? size.fontSize!) * theme.lineRatio[variant]);
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={variant === 'display' || variant === 'title' ? 1.3 : 1.6}
      style={[
        size,
        { lineHeight },
        font(family ?? base.kind, weight ?? base.weight),
        { color: tint ?? theme.colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
