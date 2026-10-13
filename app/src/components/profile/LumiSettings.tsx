import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ASSISTANT_NAME } from '../../brand';
import { haptics } from '../../lib/haptics';
import { usePrefsStore, type TalkLevel } from '../../store/prefsStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Card } from '../Card';
import { Icon } from '../Icon';
import { PressableScale } from '../motion/PressableScale';
import { SegmentedControl } from '../SegmentedControl';
import { Wardrobe } from './Wardrobe';

const TALK: { value: TalkLevel; label: string }[] = [
  { value: 'often', label: 'Sık' },
  { value: 'sometimes', label: 'Ara sıra' },
  { value: 'quiet', label: 'Sessiz' },
];

/** A labelled block inside the sheet, split from the one above by an optik hairline. */
function Section({ title, caption, first = false, children }: { title: string; caption?: string; first?: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { gap: theme.spacing.sm },
        first ? null : { borderTopWidth: theme.layout.borderWidth, borderTopColor: theme.colors.optikSoft, paddingTop: theme.spacing.md },
      ]}
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="label" weight="semibold">
          {title}
        </AppText>
        {caption ? (
          <AppText variant="caption" color="textMuted">
            {caption}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Profile → Lumi (spec 6.9): how often Lumi speaks up, what it wears, and vibration. Every
 * choice is saved per account in `prefsStore` (and haptics obey the switch at once).
 */
export function LumiSettings({ level, streak30 }: { level: number; streak30: boolean }) {
  const theme = useTheme();
  const talk = usePrefsStore((s) => s.talk);
  const setTalk = usePrefsStore((s) => s.setTalk);
  const vibrate = usePrefsStore((s) => s.haptics);
  const setHaptics = usePrefsStore((s) => s.setHaptics);

  return (
    <Card title={ASSISTANT_NAME}>
      <Section title="Konuşkanlık" caption={`${ASSISTANT_NAME} kendiliğinden ne sıklıkla söz alsın?`} first>
        <SegmentedControl<TalkLevel> options={TALK} value={talk} onChange={setTalk} />
      </Section>
      <Section title="Kıyafet">
        <Wardrobe level={level} streak30={streak30} />
      </Section>
      <View style={{ borderTopWidth: theme.layout.borderWidth, borderTopColor: theme.colors.optikSoft, paddingTop: theme.spacing.xs }}>
        <PressableScale
          kind="row"
          accessibilityRole="switch"
          accessibilityLabel="Titreşim"
          accessibilityState={{ checked: vibrate }}
          onPress={() => {
            setHaptics(!vibrate);
            // Fires only when it was just turned on: the student feels what they chose.
            haptics.select();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: theme.layout.minTouch + theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            marginHorizontal: -theme.spacing.sm,
            borderRadius: theme.radius.md,
          }}
        >
          <Icon name="vibrate" size={theme.layout.iconSize.md} color={theme.colors.textMuted} />
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="label" weight="semibold">
              Titreşim
            </AppText>
            <AppText variant="caption" color="textMuted">
              {vibrate ? 'Dokunuşlarda hafif titreşim var.' : 'Titreşim kapalı.'}
            </AppText>
          </View>
          <Bubble size="row" filled={vibrate}>
            {(c: string) => (vibrate ? <Icon name="check" size={theme.layout.iconSize.sm} color={c} weight="bold" /> : null)}
          </Bubble>
        </PressableScale>
      </View>
    </Card>
  );
}
