import { View } from 'react-native';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { Bubble } from '../Bubble';
import { Button } from '../Button';
import { useCompanionYield } from '../companion/Perch';
import { Mascot } from '../mascot/Mascot';
import { Note } from '../Note';

/** One `dot` bubble per hint, lit in fosfor as each is used. */
function HintPips({ total, used }: { total: number; used: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Bubble key={i} size="dot" tone="accent" filled={i < used} />
      ))}
    </View>
  );
}

interface Props {
  /** Before answering: Lumi thinks beside a note on how to work. */
  intro: boolean;
  /** The note's line (where to answer depends on the question). */
  line: string;
  /** Show "İpucu al" and "Tam çözümü gör" (until the solution is open or the answer is in). */
  actions: boolean;
  hintsTotal: number;
  hintsUsed: number;
  onHint: () => void;
  onSolution: () => void;
}

/**
 * "Çalışma masası", the right side of a question before it is answered: an in-tree thinking
 * Lumi with a sticky note, then hint-first help: secondary **İpucu al** (one fosfor pip per
 * hint used) and ghost **Tam çözümü gör**. Never a primary: Kodla in the dock is the
 * screen's one primary.
 */
export function WorkDesk({ intro, line, actions, hintsTotal, hintsUsed, onHint, onSolution }: Props) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  // An in-tree Lumi is on the desk: the companion steps aside (one Lumi per screen).
  useCompanionYield(intro);
  const hintsLeft = hintsTotal - hintsUsed;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {intro ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tablet ? theme.spacing.lg : theme.spacing.md }}>
          <Mascot mood="thinking" size={theme.layout.mascot.note} />
          <Note style={{ flex: 1 }}>{line}</Note>
        </View>
      ) : null}
      {actions ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
          {hintsTotal > 0 ? (
            <Button
              label={hintsLeft > 0 ? 'İpucu al' : 'İpuçları bitti'}
              icon="lightbulb"
              variant="secondary"
              disabled={hintsLeft <= 0}
              onPress={onHint}
              trailing={<HintPips total={hintsTotal} used={hintsUsed} />}
            />
          ) : null}
          <Button label="Tam çözümü gör" icon="book-open" variant="ghost" onPress={onSolution} />
        </View>
      ) : null}
    </View>
  );
}
