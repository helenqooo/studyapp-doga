import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DEMO_MODE } from '../../config';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';
import { Icon } from '../Icon';
import { PressableScale } from '../motion/PressableScale';
import { Viewfinder } from '../Viewfinder';
import { RecentThumbs } from './RecentThumbs';

/** The square gallery button beside the big camera button (phone): a secondary outline. */
function GallerySquare({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const theme = useTheme();
  const { minTouch, selectedBorder, iconSize } = theme.layout.system;
  const side = minTouch + theme.spacing.lg;
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

/**
 * "Takıldığın soruyu çek". `side` (iPad landscape): a card that stretches to the hero's
 * height, its viewfinder taking whatever room is left. `stack` (iPad portrait): a 16:10
 * viewfinder over stacked buttons. `phone`: the big camera button and a square gallery button.
 */
export function SolvePanel({ layout, style }: { layout: 'side' | 'stack' | 'phone'; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { openCamera, pickFromLibrary, trySample, busy } = usePickImage();
  const gallery = () => pickFromLibrary();
  const sample = DEMO_MODE ? <Button label="Örnek soruyu çöz" icon="sparkles" variant="ghost" size="sm" loading={busy} onPress={trySample} /> : null;

  if (layout === 'phone') {
    return (
      <View style={[{ gap: theme.spacing.sm }, style]}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={openCamera} style={{ flex: 1 }} />
          <GallerySquare onPress={gallery} busy={busy} />
        </View>
        {sample}
      </View>
    );
  }

  if (layout === 'stack') {
    return (
      <Card title="Takıldığın soruyu çek" style={style}>
        <Viewfinder aspect="16:10" label="Soruyu çerçeveye al" onPress={openCamera} />
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={openCamera} />
          <Button label="Galeriden seç" icon="images" variant="secondary" loading={busy} onPress={gallery} />
          {sample}
        </View>
        <RecentThumbs />
      </Card>
    );
  }

  return (
    <Card
      title="Takıldığın soruyu çek"
      action={DEMO_MODE ? { label: 'Örnek soruyu çöz', icon: 'sparkles', onPress: trySample } : undefined}
      style={style}
    >
      {/* The well fills what the hero leaves: laid out absolutely, it never sets the row's height. */}
      <View style={{ flex: 1, minHeight: theme.layout.thumb.recent }}>
        <Viewfinder aspect="4:3" label="Soruyu çerçeveye al" onPress={openCamera} style={[StyleSheet.absoluteFill, { aspectRatio: 'auto' }]}>
          {/* One line, so a short well never squeezes the icon. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="camera" size={theme.layout.system.iconSize.md} color={theme.colors.textMuted} />
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              Soruyu çerçeveye al
            </AppText>
          </View>
        </Viewfinder>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button label="Fotoğraf çek" icon="camera" size="lg" onPress={openCamera} style={{ flex: 1 }} />
        <Button label="Galeriden seç" icon="images" variant="secondary" size="lg" loading={busy} onPress={gallery} style={{ flex: 1 }} />
      </View>
      <RecentThumbs inline />
    </Card>
  );
}
