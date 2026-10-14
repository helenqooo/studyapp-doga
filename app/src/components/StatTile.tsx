import { Fragment } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useContentSize, useWindowLayout } from '../lib/layout';
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

/** One cell: the value in `stat` with its unit beside it on the same line, the caption under on one line. */
function Cell({ cell, padX, padY, flush = false }: { cell: KarneCell; padX: number; padY: number; flush?: boolean }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${cell.label}: ${cell.value ?? '—'}${cell.unit ? ` ${cell.unit}` : ''}`}
      style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs, paddingLeft: flush ? 0 : padX, paddingRight: padX, paddingVertical: padY }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'baseline', gap: theme.spacing.xs }}>
        {cell.value === null ? (
          <AppText variant="stat" color="textMuted">
            —
          </AppText>
        ) : (
          <Odometer value={cell.value} variant="stat" cacheKey={cell.cacheKey} />
        )}
        {cell.unit ? (
          <AppText variant="label" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {cell.unit}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" color="textMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {cell.label}
      </AppText>
    </View>
  );
}

/**
 * "Karne satırı": a report-card row, cells split by optik hairlines, each number with its
 * unit on one line and its caption on one line. The cells stay in one row while each gets
 * `layout.karne.minCell` of the measured width (four fit a half-width landscape column);
 * narrower, they fold into two rows. `sheet` (default) sits in one sheet; `plain` sets the
 * same row straight on the paper.
 */
export function KarneRow({ cells, variant = 'sheet', style }: { cells: KarneCell[]; variant?: 'sheet' | 'plain'; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { tablet, sizeClass } = useWindowLayout();
  const { width } = useContentSize();
  const k = theme.layout.karne;
  const minCell = tablet ? k.minCell.tablet : k.minCell.compact;
  // Width 0 means not measured yet: decide by the window so the first frame doesn't jump.
  const fold = cells.length > 2 && (width === 0 ? sizeClass === 'compact' : width < cells.length * minCell);
  const perRow = fold ? Math.ceil(cells.length / 2) : cells.length;
  const rows: KarneCell[][] = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));
  const padX = tablet ? k.cellPadX.tablet : k.cellPadX.compact;
  const padY = tablet ? k.cellPadY.tablet : k.cellPadY.compact;
  const hairline = { borderColor: theme.colors.optikSoft };
  const body = rows.map((row, r) => (
    <View key={r} style={[{ flexDirection: 'row' }, r > 0 ? { ...hairline, borderTopWidth: theme.layout.borderWidth } : null]}>
      {row.map((cell, i) => (
        <Fragment key={cell.label}>
          {i > 0 ? <View style={{ width: theme.layout.borderWidth, alignSelf: 'stretch', backgroundColor: theme.colors.optikSoft }} /> : null}
          <Cell cell={cell} padX={padX} padY={padY} flush={variant === 'plain' && i === 0} />
        </Fragment>
      ))}
    </View>
  ));
  if (variant === 'plain') return <View style={style}>{body}</View>;
  return <Card style={[{ paddingLeft: 0, paddingRight: 0, paddingVertical: theme.spacing.xs, gap: 0 }, style]}>{body}</Card>;
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
