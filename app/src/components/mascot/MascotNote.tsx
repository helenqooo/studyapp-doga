import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Mascot, type MascotMood } from './Mascot';

/** Lumi with a short line next to it: greetings, empty states, gentle nudges. */
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Mascot mood={mood} size={theme.layout.mascot.note} />
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <AppText weight="semibold">{title}</AppText>
        {typeof children === 'string' ? <AppText color="textMuted">{children}</AppText> : children}
        {action ? <View style={{ marginTop: theme.spacing.xs, alignSelf: 'flex-start' }}>{action}</View> : null}
      </View>
    </View>
  );
}
