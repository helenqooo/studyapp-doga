import { View } from 'react-native';
import type { AttemptResult } from '../../api/types';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { resultLook } from '../review/OptikHistory';

/**
 * A result as a quiet tag: its icon and word in the result's ink (Solve's recents, a
 * question's Geçmiş). `iconOnly` keeps a narrow row's width for its title; the row's
 * accessibility label then carries the word. `label` replaces the word ("Hepsi doğru").
 */
export function ResultTag({ result, label, iconOnly = false }: { result: AttemptResult | undefined; label?: string; iconOnly?: boolean }) {
  const theme = useTheme();
  const look = resultLook(theme, result);
  if (iconOnly) return <Icon name={look.icon} size={theme.layout.iconSize.md} color={look.color} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Icon name={look.icon} size={theme.layout.iconSize.sm} color={look.color} />
      <AppText variant="caption" weight="medium" tint={look.color} numberOfLines={1}>
        {label ?? look.label}
      </AppText>
    </View>
  );
}
