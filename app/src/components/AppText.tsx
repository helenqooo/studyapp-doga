import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type ColorTokens, type Theme } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
type ColorName = Exclude<keyof ColorTokens, 'subject' | 'chart'>;

interface Props extends TextProps {
  variant?: Variant;
  color?: ColorName;
  /** Overrides `color` with a raw token value (e.g. a subject color from the theme). */
  tint?: string;
  weight?: keyof Theme['fontWeight'];
  align?: TextStyle['textAlign'];
}

function variantStyle(theme: Theme, variant: Variant): TextStyle {
  const { fontSize, fontWeight } = theme;
  switch (variant) {
    case 'display':
      return { fontSize: fontSize.display, fontWeight: fontWeight.heavy };
    case 'title':
      return { fontSize: fontSize.xxl, fontWeight: fontWeight.heavy };
    case 'heading':
      return { fontSize: fontSize.lg, fontWeight: fontWeight.bold };
    case 'label':
      return { fontSize: fontSize.sm, fontWeight: fontWeight.semibold };
    case 'caption':
      return { fontSize: fontSize.xs, fontWeight: fontWeight.medium };
    case 'body':
    default:
      return { fontSize: fontSize.md, fontWeight: fontWeight.regular };
  }
}

export function AppText({ variant = 'body', color = 'text', tint, weight, align, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        variantStyle(theme, variant),
        { color: tint ?? theme.colors[color] },
        weight ? { fontWeight: theme.fontWeight[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
