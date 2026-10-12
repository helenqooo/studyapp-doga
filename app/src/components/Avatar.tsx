import { View } from 'react-native';
import type { AvatarKey } from '../api/types';
import { useTheme } from '../theme';
import { AppText } from './AppText';

/** Initial on a colored disc (the account's avatar color). */
export function Avatar({ name, color, size }: { name: string; color: AvatarKey; size?: number }) {
  const theme = useTheme();
  const s = size ?? theme.layout.avatar;
  const initial = name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        backgroundColor: theme.colors.avatar[color] ?? theme.colors.avatar.clay,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText family="serif" weight="semibold" tint={theme.colors.textOnAccent} style={{ fontSize: s * 0.45, lineHeight: s * 0.6 }}>
        {initial}
      </AppText>
    </View>
  );
}
