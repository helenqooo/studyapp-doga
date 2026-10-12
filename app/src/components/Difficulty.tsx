import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';

/** 1–5 stars. */
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
          name={n <= value ? 'star.fill' : 'star'}
          size={theme.fontSize.sm}
          color={n <= value ? theme.colors.xp : theme.colors.textMuted}
        />
      ))}
    </View>
  );
}
