import { StyleSheet, Text, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';
import { font, useTheme, type ColorTokens, type FontKind, type FontWeightName, type TypeVariant } from '../theme';

/** The variants of `theme.typography`, plus two deprecated aliases: `display` (= stat) and `eyebrow` (= label, muted). */
type Variant = TypeVariant | 'display' | 'eyebrow';
type ColorName = Exclude<
  keyof ColorTokens,
  'subject' | 'subjectSoft' | 'chart' | 'confetti' | 'celebrationScrim' | 'focusVignette' | 'badge' | 'avatar' | 'mascot' | 'shadow' | 'exam' | 'rings' | 'bubble'
>;

interface Props extends TextProps {
  variant?: Variant;
  /** Defaults to `text` (`textMuted` for the deprecated `eyebrow`). */
  color?: ColorName;
  /** Overrides `color` with a raw token value (e.g. a subject color from the theme). */
  tint?: string;
  weight?: FontWeightName;
  /** Overrides the variant's family (e.g. a display number inside a sans row). */
  family?: FontKind;
  align?: TextStyle['textAlign'];
  /**
   * Tabular figures. On by default for the number variants (hero, numeral, stat, numeric)
   * and whenever `family` switches to the display face; Be Vietnam Pro has none.
   */
  tabular?: boolean;
}

const ALIAS: Partial<Record<Variant, TypeVariant>> = { display: 'stat', eyebrow: 'label' };

/**
 * Text in one of the theme's type styles. Sizes follow the WINDOW size class (tablet once
 * the window is ≥ 560 pt), never the content width, so nested columns don't shrink type.
 */
export function AppText({ variant = 'body', color, tint, weight, family, align, tabular, style, maxFontSizeMultiplier, ...rest }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const tablet = width >= theme.breakpoints.window.tablet;
  const type = theme.typography[ALIAS[variant] ?? (variant as TypeVariant)];
  const kind = family ?? type.kind;
  const fontSize = tablet ? type.sizeTablet : type.size;
  // Every style has a line height; a size override keeps the style's proportion.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const lineHeight = flat?.lineHeight ?? Math.round((flat?.fontSize ?? fontSize) * type.lineRatio);
  const figures = tabular ?? (type.tabular || (family !== undefined && kind !== 'sans'));
  const colorName: ColorName = color ?? (variant === 'eyebrow' ? 'textMuted' : 'text');
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? type.maxScale}
      style={[
        { fontSize, lineHeight, letterSpacing: tablet ? type.trackingTablet : type.tracking },
        font(kind, weight ?? type.weight),
        { color: tint ?? theme.colors[colorName] },
        figures ? styles.tabular : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
