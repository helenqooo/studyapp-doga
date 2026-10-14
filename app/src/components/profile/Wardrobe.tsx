import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { haptics } from '../../lib/haptics';
import { usePrefsStore, type Outfit } from '../../store/prefsStore';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Icon, type IconName } from '../Icon';
import { Mascot } from '../mascot/Mascot';
import { PressableScale } from '../motion/PressableScale';

// TOKEN-PENDING: layout.wardrobe.itemWidth = 72 (the narrowest swatch column: the bubble and its two-line caption)
const ITEM_WIDTH = 72;

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
  level: number;
  /** The 30-day streak badge also unlocks the crown. */
  streak30: boolean;
}

/**
 * "Lumi'nin gardırobu": a live Lumi wearing the outfit, and a row of bubble swatches. Tapping
 * a swatch puts the item on (or takes it off); locked ones say the level that opens them.
 * Saved in `prefsStore.outfit`; the companion and every in-tree Lumi wear it.
 */
export function Wardrobe({ level, streak30 }: Props) {
  const theme = useTheme();
  const outfit = usePrefsStore((s) => s.outfit);
  const setOutfit = usePrefsStore((s) => s.setOutfit);
  const open = (item: Item) => level >= item.level || (item.id === 'crown' && streak30);
  const worn = (item: Item) => outfit[item.slot] === item.id;
  // Four swatches in a row when they fit, else two by two (never three and one).
  const [rowWidth, setRowWidth] = useState(0);
  const gap = theme.spacing.xs;
  const perRow = rowWidth >= ITEM_WIDTH * ITEMS.length + gap * (ITEMS.length - 1) ? ITEMS.length : 2;
  const itemWidth = rowWidth ? Math.floor((rowWidth - gap * (perRow - 1)) / perRow) : ITEM_WIDTH;

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
        style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap }}
      >
        {ITEMS.map((item) => {
          const unlocked = open(item);
          const on = unlocked && worn(item);
          return (
            <PressableScale
              key={item.id}
              kind="bubble"
              accessibilityRole="checkbox"
              accessibilityLabel={unlocked ? item.label : `${item.label}, ${item.lock}`}
              accessibilityState={{ checked: on, disabled: !unlocked }}
              disabled={!unlocked}
              onPress={() => toggle(item)}
              style={{ width: itemWidth, alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xs }}
            >
              <Bubble size="letter" filled={on}>
                {(c: string) => <Icon name={unlocked ? item.icon : 'lock'} size={theme.layout.iconSize.sm} color={unlocked ? c : theme.colors.textMuted} />}
              </Bubble>
              <AppText variant="caption" align="center" color={unlocked ? 'text' : 'textMuted'} numberOfLines={2}>
                {item.label}
              </AppText>
              {unlocked ? null : (
                <AppText variant="micro" align="center" color="textMuted" numberOfLines={2}>
                  {item.lock}
                </AppText>
              )}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
