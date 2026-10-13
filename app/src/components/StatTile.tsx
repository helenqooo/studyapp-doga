import { Fragment } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme, elevated } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Odometer } from './motion/Odometer';
import { PressableScale } from './motion/PressableScale';

export interface KarneCell {
  /** The caption under the value ("Toplam XP"). */
  label: string;
  /** null while loading (shows a dash). */
  value: number | null;
  /** A unit after the number, set apart from the numeral ("gün"). */
  unit?: string;
  /** Odometer cache key, so the number rolls from its last value. */
  cacheKey?: string;
}

/** One cell: the value in `stat`, its unit beside it, the caption under. */
function Cell({ cell }: { cell: KarneCell }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${cell.label}: ${cell.value ?? '—'}${cell.unit ? ` ${cell.unit}` : ''}`}
      style={{ flex: 1, gap: theme.spacing.xxs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
        {cell.value === null ? (
          <AppText variant="stat" color="textMuted">
            —
          </AppText>
        ) : (
          <Odometer value={cell.value} variant="stat" cacheKey={cell.cacheKey} />
        )}
        {cell.unit ? (
          <AppText variant="label" color="textMuted">
            {cell.unit}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" color="textMuted" numberOfLines={2}>
        {cell.label}
      </AppText>
    </View>
  );
}

/**
 * "Karne satırı": a report-card row in one sheet, cells split by optik hairlines. Four
 * cells sit in one row; on a phone they fold into 2 × 2 inside the same sheet.
 */
export function KarneRow({ cells, style }: { cells: KarneCell[]; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { sizeClass } = useWindowLayout();
  const perRow = sizeClass === 'compact' && cells.length > 2 ? Math.ceil(cells.length / 2) : cells.length;
  const rows: KarneCell[][] = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));
  const hairline = { borderColor: theme.colors.optikSoft };
  return (
    <Card style={[{ paddingHorizontal: 0, paddingVertical: theme.spacing.sm, gap: 0 }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={[{ flexDirection: 'row' }, r > 0 ? { ...hairline, borderTopWidth: theme.layout.borderWidth } : null]}>
          {row.map((cell, i) => (
            <Fragment key={cell.label}>
              {i > 0 ? <View style={{ width: theme.layout.borderWidth, alignSelf: 'stretch', backgroundColor: theme.colors.optikSoft }} /> : null}
              <Cell cell={cell} />
            </Fragment>
          ))}
        </View>
      ))}
    </Card>
  );
}

interface Props {
  label: string;
  value: string;
  icon: IconName;
  /** Raw color token values for the icon and its badge background. */
  color?: string;
  softColor?: string;
  caption?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** @deprecated Use `KarneRow` (the profile's report-card row); kept so stray imports compile. */
export function StatTile({ label, value, icon, color, softColor, caption, onPress, style }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primaryText;
  return (
    <PressableScale
      kind="card"
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={[{ flex: 1, ...elevated(theme), padding: theme.layout.cardPadding, gap: theme.spacing.sm }, style]}
    >
      <View
        style={{
          width: theme.layout.minTouch - theme.spacing.xs,
          height: theme.layout.minTouch - theme.spacing.xs,
          borderRadius: theme.radius.md,
          backgroundColor: softColor ?? theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={accent} />
      </View>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      {caption ? (
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      ) : null}
    </PressableScale>
  );
}
