import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

interface Props {
  children: ReactNode;
  title?: string;
  /** Raw color token used for the background (e.g. a *Soft color). */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, title, background, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: background ?? theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: background ? 0 : theme.layout.borderWidth,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {title ? (
        <AppText variant="label" color="textMuted">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
