import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';

/** 1–5 stars: lit in the XP fosfor, the rest a printed optik outline. */
export function Difficulty({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={`Zorluk ${value} / 5`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          filled={n <= value}
          size={theme.fontSize.sm}
          color={n <= value ? theme.colors.xp : theme.colors.optik}
        />
      ))}
    </View>
  );
}
