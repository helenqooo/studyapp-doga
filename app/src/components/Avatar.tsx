import { View } from 'react-native';
import type { AvatarKey } from '../api/types';
import { useTheme } from '../theme';
import { AppText } from './AppText';


interface Props {
  name: string;
  color: AvatarKey;
  size?: number;
  /** A ring around the disc in this raw color (podium tiers); the ring adds to the size. */
  ring?: string;
}

/** Initial on a colored disc (the account's avatar color). */
export function Avatar({ name, color, size, ring }: Props) {
  const theme = useTheme();
  const s = size ?? theme.layout.avatar;
  const initial = name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  const disc = (
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
      {/* Avatar fills are mid-tone inks: white reads on every one of them (not a primary fill). */}
      <AppText family="display" weight="semibold" tint={theme.colors.textOnAccent} style={{ fontSize: s * theme.layout.avatarInitial.size, lineHeight: s * theme.layout.avatarInitial.line }}>
        {initial}
      </AppText>
    </View>
  );
  if (!ring) return disc;
  const gap = theme.spacing.xxs;
  const width = theme.layout.frameBorder;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: s + (gap + width) * 2,
        height: s + (gap + width) * 2,
        borderRadius: s,
        borderWidth: width,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {disc}
    </View>
  );
}
