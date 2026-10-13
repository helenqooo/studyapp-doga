import { useEffect, useState } from 'react';
import { Image, Pressable, View, type ImageLoadEventData, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { questionImageSource } from '../api/client';
import { useSolveStore } from '../store/solveStore';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface Props {
  questionId: string;
  /** `thumb` is a small square; the others cap the height, and a taller photo expands on tap. */
  size?: 'thumb' | 'compact' | 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
}

/**
 * The question photo at its own shape (no grey bands): full width, as tall as the page is.
 * A photo taller than the size's cap shows its top with a fade and opens fully on tap.
 * The local cropped copy is used when we have it, otherwise it is fetched with auth.
 */
export function QuestionImage({ questionId, size = 'regular', style }: Props) {
  const theme = useTheme();
  const local = useSolveStore((s) => s.localImages[questionId]);
  const [expanded, setExpanded] = useState(false);
  const [ratio, setRatio] = useState<number | null>(local ? local.width / local.height : null);
  const [width, setWidth] = useState(0);
  const source = local ? { uri: local.uri } : questionImageSource(questionId);
  const uri = typeof source === 'object' && source && 'uri' in source ? source.uri : undefined;
  const headers = typeof source === 'object' && source && 'headers' in source ? source.headers : undefined;

  // The photo's shape: bundled images know it; others are asked for it (the web's load
  // event doesn't report it).
  useEffect(() => {
    if (ratio) return;
    let alive = true;
    const done = (w: number, h: number) => alive && w && h && setRatio(w / h);
    if (typeof source === 'number') {
      const a = Image.resolveAssetSource(source);
      if (a?.width) done(a.width, a.height);
    } else if (uri) {
      // Callbacks work everywhere; native also returns a promise, the web returns nothing.
      const ignore = () => {};
      try {
        const r: unknown = headers ? Image.getSizeWithHeaders(uri, headers, done, ignore) : Image.getSize(uri, done, ignore);
        if (r instanceof Promise) r.catch(ignore);
      } catch {
        // No size: the photo keeps a 4:3 frame.
      }
    }
    return () => {
      alive = false;
    };
    // Sources are rebuilt on every render; the uri (or bundled asset id) is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, uri, typeof source === 'number' ? source : null]);

  if (size === 'thumb') {
    const side = theme.layout.minTouch + theme.spacing.md;
    return (
      <View
        style={[
          { width: side, height: side, borderRadius: theme.radius.sm, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
          style,
        ]}
      >
        <Image source={source} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  const onLoad = (e: NativeSyntheticEvent<ImageLoadEventData>) => {
    const s = e.nativeEvent?.source;
    if (s?.width && s?.height) setRatio(s.width / s.height);
  };
  const natural = width ? width / (ratio ?? 4 / 3) : 0;
  const cap = theme.layout.questionImageCap[size];
  const clipped = natural > cap + 1;
  const height = expanded || !clipped ? natural : cap;
  const fade = theme.layout.questionImageFade;

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={clipped ? (expanded ? 'Görseli küçült' : 'Görselin tamamını gör') : 'Soru görseli'}
      disabled={!clipped}
      onPress={() => setExpanded((v) => !v)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ width: '100%' }, style]}
    >
      <View
        style={{
          height: height || cap,
          borderRadius: theme.radius.md,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Image source={source} resizeMode="contain" onLoad={onLoad} style={{ width: '100%', height: natural || cap }} />
        {clipped && !expanded ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: fade }}>
            <Svg width="100%" height={fade}>
              <Defs>
                <LinearGradient id="qfade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.colors.surface} stopOpacity={0} />
                  <Stop offset="1" stopColor={theme.colors.surface} stopOpacity={0.96} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height={fade} fill="url(#qfade)" />
            </Svg>
            <View
              style={{
                position: 'absolute',
                bottom: theme.spacing.sm,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surface,
                boxShadow: theme.colors.shadow.card,
              }}
            >
              <Icon name="chevron-down" size={theme.layout.iconSize.sm} color={theme.colors.primaryText} />
              <AppText variant="label" weight="semibold" color="primaryText">
                Tamamını gör
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
