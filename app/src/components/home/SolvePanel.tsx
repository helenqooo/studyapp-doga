import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { DEMO_MODE } from '../../config';
import { useWindowLayout } from '../../lib/layout';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';
import { Icon } from '../Icon';
import { PressableScale } from '../motion/PressableScale';
import { Section } from '../SectionHeader';
import { RECENT_COUNT, RecentThumbs, useRecentQuestions } from './RecentThumbs';

/** The square gallery button beside the camera button (phone): a secondary outline, as tall as it. */
function GallerySquare({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const theme = useTheme();
  const { touch } = useWindowLayout();
  const { selectedBorder, iconSize } = theme.layout.system;
  const side = touch + theme.spacing.sm;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Galeriden seç"
      disabled={busy}
      dimmed={busy}
      pressedBg={theme.colors.primarySoft}
      onPress={onPress}
      style={{
        width: side,
        height: side,
        borderRadius: theme.radius.button,
        borderCurve: 'continuous',
        borderWidth: selectedBorder,
        borderColor: theme.colors.text,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="images" size={iconSize.md} color={theme.colors.text} />
    </PressableScale>
  );
}

// TOKEN-PENDING: home.solveHeadInline = 400 (the width left of the thumbnails' caption from which "Örnek soruyu çöz" sits beside the heading)
const HEAD_INLINE_MIN = 400;

/**
 * "Takıldığın soruyu çek", a compact, secondary action block: the Solve tab owns the camera,
 * so Home only starts it. `bar` (iPad): one sheet, the heading (with "Örnek soruyu çöz" beside
 * it in demo mode) over the photo and gallery buttons; at the right, when they fit beside the
 * buttons, the latest questions under a "Son çözdüklerin" caption, as tall as the buttons
 * (never on a row of their own). `phone`: a section with the camera button and a square
 * gallery button.
 */
export function SolvePanel({ layout, style }: { layout: 'bar' | 'phone'; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { touch } = useWindowLayout();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  const gallery = () => pickFromLibrary();
  // The bar's inner width, its buttons' and its caption's own widths: whether the thumbnails
  // fit beside the buttons, and the sample action beside the heading.
  const [inner, setInner] = useState(0);
  const [buttons, setButtons] = useState(0);
  const [caption, setCaption] = useState(0);
  const recent = useRecentQuestions(RECENT_COUNT).length;

  if (layout === 'phone') {
    return (
      <Section title="Takıldığın soruyu çek" style={style}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button label="Fotoğraf çek" icon="camera" onPress={openCamera} style={{ flex: 1 }} />
          <GallerySquare onPress={gallery} busy={busy} />
        </View>
        {DEMO_MODE ? <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" size="sm" loading={busy} onPress={trySample} /> : null}
      </Section>
    );
  }

  const side = touch + theme.spacing.sm; // the md buttons' height
  const thumbsWidth = recent ? recent * side + (recent - 1) * theme.spacing.sm : 0;
  const colGap = theme.spacing.lg;
  const thumbs = recent > 0 && inner > 0 && buttons > 0 && buttons + colGap + thumbsWidth <= inner;
  // Narrow: the sample action drops under the heading instead of squeezing it.
  const inline = inner - (thumbs ? caption + colGap : 0) >= HEAD_INLINE_MIN;
  const measure = (set: (w: number) => void, at: number) => (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== at) set(w);
  };

  return (
    <Card style={style}>
      {/* The caption sits over the thumbnails: on the heading's line, or just above them when the
          sample action has dropped under the heading. */}
      <View onLayout={measure(setInner, inner)} style={{ flexDirection: 'row', alignItems: inline ? 'center' : 'flex-end', gap: colGap }}>
        <View
          style={{
            flex: 1,
            flexDirection: inline ? 'row' : 'column',
            alignItems: inline ? 'center' : 'flex-start',
            gap: inline ? theme.spacing.md : theme.spacing.xs,
          }}
        >
          <AppText variant="heading" accessibilityRole="header">
            Takıldığın soruyu çek
          </AppText>
          {DEMO_MODE ? (
            <Button
              label="Örnek soruyu çöz"
              icon="sparkles"
              variant="ghost"
              size="sm"
              loading={busy}
              onPress={trySample}
              style={inline ? { marginVertical: -theme.spacing.sm } : { marginLeft: -theme.spacing.md }}
            />
          ) : null}
        </View>
        {thumbs ? (
          <View onLayout={measure(setCaption, caption)}>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              Son çözdüklerin
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: colGap }}>
        <View onLayout={measure(setButtons, buttons)} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button label="Fotoğraf çek" icon="camera" onPress={openCamera} />
          <Button label="Galeriden seç" icon="images" variant="secondary" loading={busy} onPress={gallery} />
        </View>
        {thumbs ? <RecentThumbs size={side} style={{ marginLeft: 'auto' }} /> : null}
      </View>
    </Card>
  );
}
