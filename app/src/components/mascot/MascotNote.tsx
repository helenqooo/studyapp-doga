import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { useCompanionYield } from '../companion/Perch';
import { Note } from '../Note';
import { Mascot, type MascotMood } from './Mascot';

/**
 * Lumi saying something in place: the character beside its sticky note (greetings, empty
 * states, gentle nudges). The note is the companion's own look (note paper, noteInk text,
 * the slight tilt). While this is mounted the floating companion steps aside, so there is
 * one Lumi per screen. `action` sits under the note.
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
  useCompanionYield();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
      <Mascot mood={mood} size={theme.layout.mascot.note} />
      <View style={{ flex: 1, gap: theme.spacing.md, paddingTop: theme.spacing.xs }}>
        <Note title={title}>{children ?? null}</Note>
        {action ? <View style={{ alignSelf: 'flex-start' }}>{action}</View> : null}
      </View>
    </View>
  );
}
