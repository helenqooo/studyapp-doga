import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { haptics } from '../../lib/haptics';
import { usePrefsStore, type Outfit } from '../../store/prefsStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Icon, type IconName } from '../Icon';
import { Mascot } from '../mascot/Mascot';
import { Appear } from '../motion/Appear';
import { FadeText } from '../motion/FadeText';
import { PressableScale } from '../motion/PressableScale';


type ItemId = 'glasses' | 'party' | 'headphones' | 'crown';

interface Item {
  id: ItemId;
  slot: keyof Outfit;
  label: string;
  icon: IconName;
  level: number;
  /** "Seviye 5'te açılır", with the Turkish suffix spelled out per number. */
  lock: string;
}

/** Accessories already drawn in mascot/parts.tsx, unlocked by level (spec 8.2). The cap belongs to the graduate pose, so it isn't offered. */
const ITEMS: Item[] = [
  { id: 'glasses', slot: 'face', label: 'Gözlük', icon: 'glasses', level: 3, lock: "Seviye 3'te açılır" },
  { id: 'party', slot: 'head', label: 'Parti şapkası', icon: 'party-popper', level: 5, lock: "Seviye 5'te açılır" },
  { id: 'headphones', slot: 'head', label: 'Kulaklık', icon: 'headphones', level: 8, lock: "Seviye 8'de açılır" },
  { id: 'crown', slot: 'head', label: 'Taç', icon: 'crown', level: 12, lock: "Seviye 12'de açılır" },
];

interface Props {
  /** Null until the profile loads: the swatches wait, quiet and closed, without claiming a lock. */
  level: number | null;
  /** The 30-day streak badge also unlocks the crown. */
  streak30: boolean;
}

/**
 * "Lumi'nin gardırobu": a live Lumi wearing the outfit, and a row of bubble swatches. Tapping
 * a swatch puts the item on (or takes it off); locked ones say the level that opens them.
 * Saved in `prefsStore.outfit`; the companion and every in-tree Lumi wear it. Until the
 * level is known the bubbles stay empty and nothing says "locked"; then the glyphs and the
 * lock lines fade in.
 */
export function Wardrobe({ level, streak30 }: Props) {
  const theme = useTheme();
  const outfit = usePrefsStore((s) => s.outfit);
  const setOutfit = usePrefsStore((s) => s.setOutfit);
  const known = level !== null;
  const open = (item: Item) => known && (level >= item.level || (item.id === 'crown' && streak30));
  // Opened before the profile arrived: what arrives with it fades in. Opened with it, nothing animates.
  const [cold] = useState(!known);
  const arrive = (node: ReactNode) => (cold ? <Appear still>{node}</Appear> : node);
  const worn = (item: Item) => outfit[item.slot] === item.id;
  // Four swatches in a row when they fit, else two by two (never three and one).
  const [rowWidth, setRowWidth] = useState(0);
  // A real column gap, so two centred lock lines never read as one sentence.
  const gap = theme.spacing.md;
  const perRow = rowWidth >= theme.layout.wardrobe.itemWidth.min * ITEMS.length + gap * (ITEMS.length - 1) ? ITEMS.length : 2;
  const itemWidth = rowWidth ? Math.min(theme.layout.wardrobe.itemWidth.max, Math.floor((rowWidth - gap * (perRow - 1)) / perRow)) : theme.layout.wardrobe.itemWidth.min;

  const toggle = (item: Item) => {
    haptics.select();
    if (item.slot === 'face') setOutfit({ face: worn(item) ? null : 'glasses' });
    else setOutfit({ head: worn(item) ? null : (item.id as Exclude<Outfit['head'], null>) });
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: theme.layout.companion.size.tablet + theme.spacing.lg,
          height: theme.layout.companion.size.tablet + theme.spacing.lg,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mascot mood="idle" size={theme.layout.companion.size.tablet} outfit={outfit} interactive={false} enter={false} />
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setRowWidth(Math.floor(e.nativeEvent.layout.width))}
        style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: gap, rowGap: theme.spacing.sm }}
      >
        {ITEMS.map((item) => {
          const unlocked = open(item);
          const on = unlocked && worn(item);
          return (
            <PressableScale
              key={item.id}
              kind="bubble"
              accessibilityRole="checkbox"
              accessibilityLabel={unlocked || !known ? item.label : `${item.label}, ${item.lock}`}
              accessibilityState={{ checked: on, disabled: !unlocked, busy: !known }}
              disabled={!unlocked}
              onPress={() => toggle(item)}
              style={{ width: itemWidth, alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xs }}
            >
              <Bubble size="letter" filled={on}>
                {(c: string) =>
                  known ? arrive(<Icon name={unlocked ? item.icon : 'lock'} size={theme.layout.iconSize.sm} color={unlocked ? c : theme.colors.textMuted} />) : null
                }
              </Bubble>
              <FadeText variant="caption" align="center" tint={unlocked ? theme.colors.text : theme.colors.textMuted} numberOfLines={2}>
                {item.label}
              </FadeText>
              {unlocked || !known
                ? null
                : arrive(
                    <AppText variant="caption" align="center" color="textMuted" numberOfLines={2}>
                      {item.lock}
                    </AppText>,
                  )}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
