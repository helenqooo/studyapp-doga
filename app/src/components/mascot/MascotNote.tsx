import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Mascot, type MascotMood } from './Mascot';

/**
 * Lumi saying something: the character with a speech bubble next to it (greetings,
 * empty states, gentle nudges). `action` sits under the bubble.
 */
export function MascotNote({
  mood = 'idle',
  title,
  children,
  action,
}: {
  mood?: MascotMood;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const theme = useTheme();
  const tail = theme.layout.bubbleTail;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Mascot mood={mood} size={theme.layout.mascot.note} />
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* The bubble's tail: a small diamond tucked under its left edge. */}
          <View
            style={{
              width: tail,
              height: tail,
              marginRight: -tail / 2,
              borderRadius: theme.spacing.xxs,
              backgroundColor: theme.colors.bubble,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              flex: 1,
              gap: theme.spacing.xxs,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderCurve: 'continuous',
              backgroundColor: theme.colors.bubble,
            }}
          >
            <AppText weight="semibold">{title}</AppText>
            {typeof children === 'string' ? <AppText color="textMuted">{children}</AppText> : children}
          </View>
        </View>
        {action ? <View style={{ alignSelf: 'flex-start' }}>{action}</View> : null}
      </View>
    </View>
  );
}
