import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme';

// Lumi's mark, "Odak halkası": an open ring with its gap at the top right and a dot
// drifting toward the gap, the moment something comes into focus. 100-unit grid, same
// geometry as assets/brand/logo.svg.
export const LOGO_RING = 'M78.19 39.74 A30 30 0 1 1 60.26 21.81';
export const LOGO_DOT = { cx: 55.7, cy: 44.3, r: 9 };

export function LogoMark({ size, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const s = size ?? theme.layout.iconSize.lg;
  const fill = color ?? theme.colors.accent;
  return (
    <Svg width={s} height={s} viewBox="13 13 74 74" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={LOGO_RING} fill="none" stroke={fill} strokeWidth={14} strokeLinecap="round" />
      <Circle {...LOGO_DOT} fill={fill} />
    </Svg>
  );
}
