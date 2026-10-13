import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { Icon, type IconName } from '../Icon';
import { MathView } from '../math/MathView';
import { Appear } from '../motion/Appear';
import { RevealOnMount } from '../Screen';

/**
 * A hint sheet: warm hint paper with a 3 pt fosfor edge down its left side, like a line
 * marked in the margin.
 */
export function HintSheet({ title, icon = 'lightbulb', children }: { title: string; icon?: IconName; children: ReactNode }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const c = theme.colors;
  const pad = tablet ? theme.layout.sheetPadding.tablet : theme.layout.sheetPadding.compact;
  const edge = theme.layout.note.edge;
  return (
    <View
      style={{
        backgroundColor: c.hintBackground,
        borderRadius: theme.radius.lg,
        borderCurve: 'continuous',
        overflow: 'hidden',
        padding: pad,
        paddingLeft: pad + edge,
        gap: theme.spacing.sm,
      }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: edge, backgroundColor: c.accent }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name={icon} size={theme.layout.iconSize.sm} color={c.text} duotone />
        <AppText variant="label" weight="semibold" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

/** The hints opened so far, "İpucu 1/3" and on, each typing itself in as it arrives. */
export function HintStack({ hints, shown }: { hints: string[]; shown: number }) {
  const theme = useTheme();
  if (shown <= 0) return null;
  return (
    <View style={{ gap: theme.spacing.md }}>
      {hints.slice(0, shown).map((hint, i) => (
        <RevealOnMount key={i}>
          <Appear>
            <HintSheet title={`İpucu ${i + 1}/${hints.length}`}>
              <MathView markdown={hint} typing="type" fontSize={theme.fontSize.lg} />
            </HintSheet>
          </Appear>
        </RevealOnMount>
      ))}
    </View>
  );
}

interface SolutionProps {
  markdown: string;
  /** Type it in (when it was just asked for or just unlocked). */
  typing?: boolean;
  /** Scroll it into view on mount (only when she asked for it). */
  reveal?: boolean;
  /** Ease it in on mount (content that arrived by an action; never on a plain page open). */
  appear?: boolean;
}

/** The worked solution on a plain sheet. Keep `reveal` and `appear` fixed for its life. */
export function SolutionSheet({ markdown, typing = true, reveal = true, appear = true }: SolutionProps) {
  const theme = useTheme();
  const card = (
    <Card title="Tam çözüm">
      <MathView markdown={markdown} typing={typing ? 'type' : 'off'} fontSize={theme.fontSize.lg} />
    </Card>
  );
  const sheet = appear ? <Appear>{card}</Appear> : card;
  return reveal ? <RevealOnMount>{sheet}</RevealOnMount> : sheet;
}
