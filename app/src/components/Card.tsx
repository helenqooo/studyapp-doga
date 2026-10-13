import { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { elevated, useTheme, type ElevationLevel } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import type { IconName } from './Icon';
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
  /** A 4 pt left edge in a subject ink (raw color). */
  accent?: string;
  /** Makes the whole card a press target (card press feedback). */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const LEVEL: Record<CardVariant, ElevationLevel> = { sheet: 'sheet', elevated: 'sheet', hero: 'sheet', flat: 'flat', note: 'note' };

export function Card({ children, title, action, background, variant = 'sheet', accent, onPress, accessibilityLabel, style }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const base = elevated(theme, LEVEL[variant]);
  const tinted = !!background;
  const hero = variant === 'hero';
  const padding =
    variant === 'note'
      ? theme.layout.note.padding
      : width >= theme.breakpoints.window.tablet
        ? theme.layout.sheetPadding.tablet
        : theme.layout.sheetPadding.compact;

  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== height) setHeight(h);
  };

  const box: ViewStyle = {
    ...base,
    ...(tinted ? { backgroundColor: background, borderColor: theme.colors.transparent, borderWidth: 0, boxShadow: theme.colors.shadow.none } : null),
    padding,
    paddingLeft: accent ? padding + ACCENT_EDGE : padding,
    gap: theme.spacing.md,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
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

  if (onPress) {
    return (
      <PressableScale kind="card" accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} onLayout={hero ? onLayout : undefined} style={[box, style]}>
        {decor}
        {header}
        {children}
      </PressableScale>
    );
  }
  return (
    <View onLayout={hero ? onLayout : undefined} accessibilityLabel={accessibilityLabel} style={[box, style]}>
      {decor}
      {header}
      {children}
    </View>
  );
}
