import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export type IconName = SFSymbol;

interface Props {
  name: IconName;
  size?: number;
  /** Raw color token value; defaults to the theme text color. */
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/** SF Symbols icon (iOS). */
export function Icon({ name, size, color, style }: Props) {
  const theme = useTheme();
  const s = size ?? theme.layout.iconSize.md;
  return (
    <SymbolView
      name={name}
      size={s}
      tintColor={color ?? theme.colors.text}
      type="monochrome"
      style={[{ width: s, height: s }, style]}
    />
  );
}
