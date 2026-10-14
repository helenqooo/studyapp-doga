import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme';

// Lumi's mark, "Odak halkası": an open ring with its gap at the top right and a dot
// drifting toward the gap, the moment something comes into focus. 100-unit grid, same
// geometry as assets/brand/logo.svg and scripts/build-brand-assets.py.
export const LOGO_RING = 'M78.19 39.74 A30 30 0 1 1 60.26 21.81';
export const LOGO_DOT = { cx: 55.7, cy: 44.3, r: 9 };
const LOGO_STROKE = 14;
const LOGO_VIEWBOX = '13 13 74 74';

/**
 * The mark in clay (`accent`), ring and dot alike. `color` paints the whole mark in one ink
 * (on a fill, say); `dotColor` overrides the dot.
 */
export function LogoMark({ size, color, dotColor }: { size?: number; color?: string; dotColor?: string }) {
  const theme = useTheme();
  const s = size ?? theme.layout.iconSize.lg;
  const ring = color ?? theme.colors.accent;
  const dot = dotColor ?? color ?? theme.colors.accent;
  return (
    // Decorative: hidden from screen readers on the wrapper (the web Svg can't take a11y props).
    <View aria-hidden style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox={LOGO_VIEWBOX}>
        <Path d={LOGO_RING} fill="none" stroke={ring} strokeWidth={LOGO_STROKE} strokeLinecap="round" />
        <Circle {...LOGO_DOT} fill={dot} />
      </Svg>
    </View>
  );
}
