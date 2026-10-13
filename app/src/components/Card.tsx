import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

export type CardVariant = 'elevated' | 'hero' | 'flat';

interface Props {
  children: ReactNode;
  title?: string;
  /** Raw color token used for the background (e.g. a *Soft color): a tinted, shadowless card. */
  background?: string;
  /** `elevated` rests on the page like thick paper; `hero` lifts a little higher; `flat` sits in it. */
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, title, background, variant = 'elevated', style }: Props) {
  const theme = useTheme();
  const dark = theme.scheme === 'dark';
  const tinted = !!background;
  const shadow = tinted || variant === 'flat' ? theme.colors.shadow.none : variant === 'hero' ? theme.colors.shadow.raised : theme.colors.shadow.card;
  return (
    <View
      style={[
        {
          backgroundColor: background ?? (variant === 'flat' ? theme.colors.surfaceAlt : theme.colors.surface),
          borderRadius: variant === 'hero' ? theme.radius.xl : theme.radius.lg,
          borderCurve: 'continuous',
          // Light cards are lifted by their shadow; dark ones keep a hairline edge.
          borderWidth: !tinted && variant !== 'flat' && dark ? theme.layout.borderWidth : 0,
          borderColor: theme.colors.border,
          boxShadow: shadow,
          padding: theme.layout.cardPadding,
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
