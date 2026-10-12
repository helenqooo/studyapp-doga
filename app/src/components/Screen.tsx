import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Set false for screens that manage their own layout. */
  scroll?: boolean;
  /** Pad the top by the safe-area inset (tab screens without a header). */
  safeTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ title, subtitle, children, scroll = true, safeTop = true, contentStyle }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: (safeTop ? insets.top : 0) + theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  };

  const header = title ? (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.background }, padding, contentStyle]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[padding, contentStyle]}
      // Tab screens pad by the safe area themselves; screens under a native header let iOS adjust.
      contentInsetAdjustmentBehavior={safeTop ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {header}
      {children}
    </ScrollView>
  );
}
