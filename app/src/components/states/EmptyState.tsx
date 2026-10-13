import type { ReactNode } from 'react';
import { Card } from '../Card';
import { MascotNote } from '../mascot/MascotNote';
import type { MascotMood } from '../mascot/Mascot';

/** Nothing here yet: Lumi says what this place is for and points to the first step. */
export function EmptyState({ mood = 'wave', title, children, action }: { mood?: MascotMood; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <MascotNote mood={mood} title={title} action={action}>
        {children}
      </MascotNote>
    </Card>
  );
}
