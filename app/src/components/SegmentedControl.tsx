import { Pressable, View } from 'react-native';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';
import { AppText } from './AppText';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: theme.spacing.xs,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        gap: theme.spacing.xs,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: theme.layout.minTouch - theme.spacing.xs,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.sm,
              backgroundColor: active ? theme.colors.surface : theme.colors.transparent,
            }}
          >
            <AppText variant="label" color={active ? 'text' : 'textMuted'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
