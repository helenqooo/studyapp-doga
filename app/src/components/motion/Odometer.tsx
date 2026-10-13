import { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useTheme, type TypeVariant } from '../../theme';
import { AppText } from '../AppText';
import { spring } from './presets';

type AppTextProps = React.ComponentProps<typeof AppText>;

export interface OdometerProps extends Omit<AppTextProps, 'children'> {
  value: number;
  /** Turns the number into its label; digits roll, everything else is static. Default: rounded. */
  format?: (n: number) => string;
  /**
   * Remembers the last value under this key, so the number rolls from where the student
   * last saw it (e.g. `home.xp`) instead of appearing at its new value.
   */
  cacheKey?: string;
}

/** The last value shown per cacheKey, for this app session. */
const lastSeen = new Map<string, number>();

// A wheel: 0–9 with a 9 above and a 0 below, so a spring overshoot past either end shows
// the neighbouring digit instead of an empty box.
const WHEEL = ['9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;
const ALIAS: Partial<Record<string, TypeVariant>> = { display: 'stat', eyebrow: 'label' };
const isDigit = (c: string) => c >= '0' && c <= '9';
const defaultFormat = (n: number) => String(Math.round(n));

/**
 * A number whose digits roll like a counter: each digit is a 0–9 column in a clipped box,
 * settling with `springs.settle`, the rightmost first (`odometer.digitStagger` apart). Runs on
 * the UI thread. Use a display variant (hero, numeral, stat, numeric) so the figures are
 * tabular. Reduce Motion: the new value appears at once.
 */
export function Odometer({ value, format = defaultFormat, cacheKey, variant = 'numeric', style, tabular = true, ...text }: OdometerProps) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const label = format(value);
  // Where a column starts rolling: the label shown before this one. At mount that is the
  // cached value for this key (else the value itself, so nothing rolls).
  const prevLabel = useRef<string | null>(null);
  if (prevLabel.current === null) {
    const cached = cacheKey !== undefined ? lastSeen.get(cacheKey) : undefined;
    prevLabel.current = format(cached ?? value);
  }
  const from = [...prevLabel.current];
  useEffect(() => {
    prevLabel.current = label;
    if (cacheKey !== undefined) lastSeen.set(cacheKey, value);
  }, [cacheKey, value, label]);

  // One cell height for every character, so the digit columns move in whole cells. iOS
  // scales the text's line height with Dynamic Type (capped by the variant), so the cell does too.
  const type = theme.typography[ALIAS[variant] ?? (variant as TypeVariant)];
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const size = flat?.fontSize ?? (width >= theme.breakpoints.window.tablet ? type.sizeTablet : type.size);
  const lineHeight = flat?.lineHeight ?? Math.round(size * type.lineRatio);
  const cell = Math.ceil(lineHeight * Math.min(Math.max(fontScale, 1), text.maxFontSizeMultiplier ?? type.maxScale));

  // Columns are keyed from the right, so units stay units when the number gains a digit.
  // Runs of other characters ("/ ", " XP", ",") stay one static text, keeping their kerning.
  const chars = [...label];
  const offset = from.length - chars.length;
  const parts: { key: string; text: string; digit?: number; initial?: number; fromRight: number }[] = [];
  chars.forEach((c, i) => {
    const fromRight = chars.length - 1 - i;
    if (isDigit(c)) {
      const prev = from[i + offset];
      parts.push({ key: `d${fromRight}`, text: c, digit: Number(c), initial: prev !== undefined && isDigit(prev) ? Number(prev) : 0, fromRight });
      return;
    }
    const last = parts[parts.length - 1];
    if (last && last.digit === undefined) {
      last.text += c;
      last.key = `s${fromRight}`;
    } else {
      parts.push({ key: `s${fromRight}`, text: c, fromRight });
    }
  });
  const justifyContent = text.align === 'center' ? 'center' : text.align === 'right' ? 'flex-end' : 'flex-start';
  const cellBox = { height: cell, justifyContent: 'center', alignItems: 'center' } as const;

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label} style={[styles.row, { justifyContent }]}>
      {parts.map((part) =>
        part.digit === undefined ? (
          <View key={part.key} style={cellBox}>
            <AppText {...text} variant={variant} tabular={tabular} style={style}>
              {part.text}
            </AppText>
          </View>
        ) : (
          <DigitColumn
            key={part.key}
            digit={part.digit}
            initial={part.initial ?? 0}
            delay={part.fromRight * theme.motion.odometer.digitStagger}
            cell={cell}
            instant={reduceMotion}
          >
            {WHEEL.map((d, k) => (
              <View key={k} style={cellBox}>
                <AppText {...text} variant={variant} tabular={tabular} style={style}>
                  {d}
                </AppText>
              </View>
            ))}
          </DigitColumn>
        ),
      )}
    </View>
  );
}

function DigitColumn({
  digit,
  initial,
  delay,
  cell,
  instant,
  children,
}: {
  digit: number;
  initial: number;
  delay: number;
  cell: number;
  instant: boolean;
  children: React.ReactNode;
}) {
  const pos = useSharedValue(instant ? digit : initial);

  useEffect(() => {
    pos.value = instant ? digit : withDelay(delay, withSpring(digit, spring('settle')));
  }, [digit, delay, instant, pos]);

  // +1: the wheel starts with the 9 above the 0.
  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -(pos.value + 1) * cell }] }), [cell]);

  return (
    <View style={{ height: cell, overflow: 'hidden' }}>
      <Animated.View style={columnStyle}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
