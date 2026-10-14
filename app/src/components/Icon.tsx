import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme';
import { ICONS, type IconName } from './icons/icons.generated';

export type { IconName };


interface Props {
  name: IconName;
  size?: number;
  /** Raw color token value; defaults to the theme text color. */
  color?: ColorValue;
  /** Fills closed shapes too (e.g. a solid star or flame). */
  filled?: boolean;
  /** A soft fosfor glow (`mascot.glowSoft`) fills the shapes under the stroke. */
  duotone?: boolean;
  /** Stroke weight: regular `layout.iconStroke` (2.0) or bold (2.4). */
  weight?: 'regular' | 'bold';
  style?: StyleProp<ViewStyle>;
}

const ELEMENTS = { path: Path, circle: Circle, line: Line, rect: Rect } as const;

/** Line icon drawn with react-native-svg on a 24-unit grid (same on iOS and web). */
export function Icon({ name, size, color, filled = false, duotone = false, weight = 'regular', style }: Props) {
  const theme = useTheme();
  const s = size ?? theme.layout.iconSize.md;
  const c = color ?? theme.colors.text;
  const shapes = (keyPrefix: string) =>
    ICONS[name].map(([tag, attrs], i) => {
      const El = ELEMENTS[tag as keyof typeof ELEMENTS];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return El ? <El key={`${keyPrefix}${i}`} {...(attrs as any)} /> : null;
    });
  return (
    <Svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={filled ? c : 'none'}
      stroke={c}
      strokeWidth={weight === 'bold' ? theme.layout.system.iconStrokeBold : theme.layout.iconStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      pointerEvents="none"
    >
      {duotone && !filled ? (
        <G fill={theme.colors.mascot.glowSoft} stroke="none">
          {shapes('d')}
        </G>
      ) : null}
      {shapes('s')}
    </Svg>
  );
}
