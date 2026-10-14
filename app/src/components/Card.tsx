import { Children, createContext, Fragment, isValidElement, useContext, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useWindowLayout } from '../lib/layout';
import { elevated, useTheme, type ElevationLevel } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Kareli } from './Kareli';
import { PressableScale } from './motion/PressableScale';

// TOKEN-PENDING: layout.sheet.accentEdge = 4 (the subject-ink left edge of a card, spec 3 Card)
const ACCENT_EDGE = 4;

/** `elevated` is the deprecated name of `sheet`. */
export type CardVariant = 'sheet' | 'hero' | 'flat' | 'note' | 'elevated';

export interface CardAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

interface Props {
  children: ReactNode;
  /** A heading inside the top of the card. */
  title?: string;
  /** A small ghost action at the right of the title row. */
  action?: CardAction;
  /** Raw color token used for the background (e.g. a *Soft color): a tinted, flat card. */
  background?: string;
  /**
   * `sheet`: paper on the desk (1 pt edge, a soft shadow). `hero`: a sheet with graph paper
   * fading out over its top. `flat`: a well in the page. `note`: Lumi's sticky-note paper.
   */
  variant?: CardVariant;
  /**
   * One sheet holding a group of rows: each child is a row, split from the next by an optik
   * hairline. `ListRow` children run edge to edge (their press tint fills the row); any other
   * child is padded like a row. Use it instead of one card per item.
   */
  divided?: boolean;
  /** A 4 pt left edge in a subject ink (raw color). */
  accent?: string;
  /** Makes the whole card a press target (card press feedback). */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const LEVEL: Record<CardVariant, ElevationLevel> = { sheet: 'sheet', elevated: 'sheet', hero: 'sheet', flat: 'flat', note: 'note' };

/** Where a row sits in a divided card: its side padding and which corners it rounds. */
interface GroupSlot {
  padding: number;
  first: boolean;
  last: boolean;
  radius: number;
}

const GroupContext = createContext<GroupSlot | null>(null);

/** The hairline between two rows of a group, inset to the rows' padding. */
export function GroupDivider({ inset }: { inset?: number }) {
  const theme = useTheme();
  const { sheetPadding } = useWindowLayout();
  const side = inset ?? sheetPadding;
  return <View style={{ height: theme.layout.borderWidth, marginHorizontal: side, backgroundColor: theme.colors.optikSoft }} />;
}

export function Card({ children, title, action, background, variant = 'sheet', divided = false, accent, onPress, accessibilityLabel, style }: Props) {
  const theme = useTheme();
  const { sheetPadding } = useWindowLayout();
  const [height, setHeight] = useState(0);
  const base = elevated(theme, LEVEL[variant]);
  const tinted = !!background;
  const hero = variant === 'hero';
  const padding = variant === 'note' ? theme.layout.note.padding : sheetPadding;

  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== height) setHeight(h);
  };

  const box: ViewStyle = {
    ...base,
    ...(tinted ? { backgroundColor: background, borderColor: theme.colors.transparent, borderWidth: 0, boxShadow: theme.colors.shadow.none } : null),
    padding: divided ? 0 : padding,
    // Only the accent edge sets a longhand: a paddingLeft here would beat a caller's
    // `paddingHorizontal` (or, on iOS, even `padding`) and leave the sheet lopsided.
    ...(accent ? { paddingLeft: padding + ACCENT_EDGE } : null),
    gap: divided ? 0 : theme.spacing.md,
  };

  // Decorations sit in their own clipped layer so the sheet keeps its shadow.
  const corners = {
    borderRadius: base.borderRadius,
    borderBottomRightRadius: base.borderBottomRightRadius,
    borderCurve: 'continuous' as const,
  };
  const decor =
    hero || accent ? (
      <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, corners, { overflow: 'hidden' }]}>
        {hero && height > 0 ? <Kareli height={Math.round(height * theme.layout.kareli.heroShare)} /> : null}
        {accent ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: ACCENT_EDGE, backgroundColor: accent }} /> : null}
      </View>
    ) : null;

  const header =
    title || action ? (
      <View
        style={[
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
          divided ? { paddingHorizontal: padding, paddingTop: padding - theme.spacing.xs, paddingBottom: theme.spacing.xs } : null,
        ]}
      >
        {title ? (
          <AppText variant="heading" tint={variant === 'note' ? theme.colors.noteInk : undefined} style={{ flexShrink: 1 }} accessibilityRole="header">
            {title}
          </AppText>
        ) : (
          <View />
        )}
        {action ? (
          <Button
            variant="ghost"
            size="sm"
            label={action.label}
            icon={action.icon}
            onPress={action.onPress}
            style={{ marginVertical: -theme.spacing.sm, marginRight: -theme.spacing.md }}
          />
        ) : null}
      </View>
    ) : null;

  const body = divided ? (
    <GroupRows padding={padding} radius={base.borderRadius} hasHeader={!!header}>
      {children}
    </GroupRows>
  ) : (
    children
  );

  if (onPress) {
    return (
      <PressableScale kind="card" accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} onLayout={hero ? onLayout : undefined} style={[box, style]}>
        {decor}
        {header}
        {body}
      </PressableScale>
    );
  }
  return (
    <View onLayout={hero ? onLayout : undefined} accessibilityLabel={accessibilityLabel} style={[box, style]}>
      {decor}
      {header}
      {body}
    </View>
  );
}

/** The rows of a divided card: hairlines between them, padding for children that aren't ListRows. */
function GroupRows({ children, padding, radius, hasHeader }: { children: ReactNode; padding: number; radius: number; hasHeader: boolean }) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const padY = tablet ? theme.layout.group.rowPadY.tablet : theme.layout.group.rowPadY.compact;
  const items = Children.toArray(children);
  return (
    <>
      {items.map((item, i) => {
        const slot: GroupSlot = { padding, first: i === 0 && !hasHeader, last: i === items.length - 1, radius };
        const isRow = isValidElement(item) && item.type === ListRow;
        return (
          <Fragment key={isValidElement(item) && item.key != null ? item.key : i}>
            {i > 0 ? <GroupDivider inset={padding} /> : null}
            <GroupContext.Provider value={slot}>
              {isRow ? item : <View style={{ paddingHorizontal: padding, paddingVertical: padY + theme.spacing.xs }}>{item}</View>}
            </GroupContext.Provider>
          </Fragment>
        );
      })}
    </>
  );
}

interface ListRowProps {
  /** The row's name, in `body` medium. */
  title: string;
  /** A muted second line (topic path, date, count). */
  detail?: string;
  /** A line icon before the title, in `primaryText`. */
  icon?: IconName;
  /** Anything before the title instead of an icon: a thumbnail, an avatar, a subject dot. */
  leading?: ReactNode;
  /** A right-aligned value in `numeric` (e.g. "82,25"). */
  value?: string;
  /** Anything at the right instead of (or before) the chevron: a tag, a badge, a bubble row. */
  trailing?: ReactNode;
  /** Makes the row a press target (a `primarySoft` tint fades in behind it) with a chevron. */
  onPress?: () => void;
  /** Show the chevron (default: when the row has `onPress`). */
  chevron?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * One row of a group (52 pt on a phone, 60 on a tablet): leading icon or thumbnail, title
 * and a muted detail line, then a value, a trailing element and a chevron. Inside
 * `<Card divided>` it runs edge to edge with the sheet's padding; on its own it is a row on
 * the paper.
 */
export function ListRow({ title, detail, icon, leading, value, trailing, onPress, chevron, accessibilityLabel, style }: ListRowProps) {
  const theme = useTheme();
  const { tablet } = useWindowLayout();
  const slot = useContext(GroupContext);
  const g = theme.layout.group;
  const padY = tablet ? g.rowPadY.tablet : g.rowPadY.compact;
  const lead = tablet ? g.leading.tablet : g.leading.compact;
  const showChevron = chevron ?? !!onPress;
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: tablet ? g.rowMinHeight.tablet : g.rowMinHeight.compact,
    paddingVertical: padY,
    paddingHorizontal: slot ? slot.padding : theme.spacing.md,
    // The press tint follows the sheet's corners on the first and last rows.
    borderRadius: slot ? 0 : theme.radius.md,
    borderTopLeftRadius: slot?.first ? slot.radius : undefined,
    borderTopRightRadius: slot?.first ? slot.radius : undefined,
    borderBottomLeftRadius: slot?.last ? slot.radius : undefined,
    borderBottomRightRadius: slot?.last ? slot.radius : undefined,
    borderCurve: 'continuous',
  };
  const content = (
    <>
      {leading ?? (icon ? (
        <View style={{ width: lead, alignItems: 'center' }}>
          <Icon name={icon} size={theme.layout.iconSize.md} color={theme.colors.primaryText} duotone />
        </View>
      ) : null)}
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs }}>
        <AppText weight="medium" numberOfLines={2}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {value ? <AppText variant="numeric">{value}</AppText> : null}
      {trailing}
      {showChevron ? <Icon name="chevron-right" size={theme.layout.iconSize.sm} color={theme.colors.textMuted} /> : null}
    </>
  );
  if (onPress) {
    return (
      <PressableScale kind="row" accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} style={[rowStyle, style]}>
        {content}
      </PressableScale>
    );
  }
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={[rowStyle, style]}>
      {content}
    </View>
  );
}
