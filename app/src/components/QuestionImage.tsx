import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ImageLoadEventData,
  type ImageSourcePropType,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { questionImageSource } from '../api/client';
import { useWindowLayout } from '../lib/layout';
import { useSolveStore } from '../store/solveStore';
import { elevated, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './motion/PressableScale';
import { ease } from './motion/presets';


interface Props {
  questionId: string;
  /** `thumb` is a small square; the others cap the height, and a taller photo expands on tap. */
  size?: 'thumb' | 'compact' | 'regular' | 'large';
  /** A height cap (pt) that overrides the size's cap (e.g. `layout.question.imageCap`). */
  cap?: number;
  /**
   * Where "Tamamını gör" sits on a clipped photo: `below` (default) is a row under the
   * photo, so it never covers the question; `overlay` floats it over the fade.
   */
  pillPlacement?: 'below' | 'overlay';
  /** The photo could not be loaded. */
  onError?: () => void;
  /** A tap on the photo opens it full screen (pinch to zoom on iOS); the pill still expands it here. */
  zoomable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The question photo at its own shape (no grey bands): full width, as tall as the page is.
 * A photo taller than the cap shows its top with a paper fade and opens fully on tap (the
 * height glides open). The local cropped copy is used when we have it, otherwise it is
 * fetched with auth.
 */
export function QuestionImage({ questionId, size = 'regular', cap: capProp, pillPlacement = 'below', onError, zoomable = false, style }: Props) {
  const theme = useTheme();
  const { touch } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const local = useSolveStore((s) => s.localImages[questionId]);
  const [expanded, setExpanded] = useState(false);
  const [viewing, setViewing] = useState(false);
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

  const natural = width ? width / (ratio ?? 4 / 3) : 0;
  const cap = capProp ?? (size === 'thumb' ? 0 : theme.layout.questionImageCap[size]);
  const clipped = size !== 'thumb' && natural > cap + 1;
  const target = expanded || !clipped ? natural : cap;
  const fade = theme.layout.questionImageFade;
  // The fade ends in the photo's own paper, so a clipped scan ends in a soft white edge.
  const paper = theme.colors.photoPaper;

  // The frame's height glides between the cap and the whole photo when she taps; sizing on
  // load (width, then the photo's real shape) is set at once, so nothing moves on open.
  const height = useSharedValue(0);
  const veil = useSharedValue(1);
  const glide = useRef(false);
  useEffect(() => {
    if (!target) return;
    const animate = glide.current && !reduceMotion;
    glide.current = false;
    if (!animate) {
      height.value = target;
      return;
    }
    height.value = withTiming(target, { duration: theme.motion.duration.base, easing: ease('standard') });
  }, [target, reduceMotion, height, theme.motion.duration.base]);
  useEffect(() => {
    veil.value = withTiming(clipped && !expanded ? 1 : 0, {
      duration: reduceMotion ? theme.motion.duration.rmFade : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [clipped, expanded, reduceMotion, veil, theme.motion.duration.base]);
  const frameStyle = useAnimatedStyle(() => ({ height: height.value || cap }), [cap]);
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  if (size === 'thumb') {
    const side = theme.layout.minTouch + theme.spacing.md;
    return (
      <View
        style={[
          { width: side, height: side, borderRadius: theme.radius.sm, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
          style,
        ]}
      >
        <Image source={source} resizeMode="cover" onError={onError} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  const onLoad = (e: NativeSyntheticEvent<ImageLoadEventData>) => {
    const s = e.nativeEvent?.source;
    if (s?.width && s?.height) setRatio(s.width / s.height);
  };
  const toggle = () => {
    glide.current = true;
    setExpanded((v) => !v);
  };
  const below = pillPlacement === 'below';
  const pillLabel = expanded ? 'Küçült' : 'Tamamını gör';

  const pillFace = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: below ? theme.colors.surfaceAlt : theme.colors.surface,
        boxShadow: below ? theme.colors.shadow.none : theme.colors.shadow.card,
      }}
    >
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={theme.layout.iconSize.sm} color={theme.colors.primaryText} />
      <AppText variant="label" weight="semibold" color="primaryText">
        {pillLabel}
      </AppText>
    </View>
  );

  return (
    <View style={[{ width: '100%', gap: theme.spacing.xs }, style]}>
      <Pressable
        // With the pill below, the pill is the control; the photo itself stays a plain image,
        // unless a tap opens it full screen.
        accessible={zoomable || !(below && clipped)}
        accessibilityRole={zoomable || clipped ? 'imagebutton' : 'image'}
        accessibilityLabel={zoomable ? 'Soruyu tam ekranda aç' : clipped ? (expanded ? 'Görseli küçült' : 'Görselin tamamını gör') : 'Soru görseli'}
        disabled={!zoomable && !clipped}
        onPress={zoomable ? () => setViewing(true) : toggle}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%' }}
      >
        <Animated.View
          style={[
            {
              borderRadius: theme.radius.md,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: theme.colors.surfaceAlt,
            },
            frameStyle,
          ]}
        >
          <Image source={source} resizeMode="contain" onLoad={onLoad} onError={onError} style={{ width: '100%', height: natural || cap }} />
          {clipped ? (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: fade }, veilStyle]}>
              <Svg width="100%" height={fade}>
                <Defs>
                  <LinearGradient id="qfade" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={paper} stopOpacity={0} />
                    <Stop offset="1" stopColor={paper} stopOpacity={theme.opacity.imageFade} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height={fade} fill="url(#qfade)" />
              </Svg>
              {!below && !expanded ? <View style={{ position: 'absolute', bottom: theme.spacing.sm, alignSelf: 'center' }}>{pillFace}</View> : null}
            </Animated.View>
          ) : null}
        </Animated.View>
      </Pressable>
      {clipped && below ? (
        <PressableScale
          kind="bubble"
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Görseli küçült' : 'Görselin tamamını gör'}
          accessibilityState={{ expanded }}
          onPress={toggle}
          style={{ alignSelf: 'center', minHeight: touch, justifyContent: 'center' }}
        >
          {pillFace}
        </PressableScale>
      ) : null}
      {zoomable ? <PhotoViewer source={source} ratio={ratio} visible={viewing} onClose={() => setViewing(false)} /> : null}
    </View>
  );
}

/**
 * The question photo full screen, as large as the window allows, on the paper. iOS zooms it
 * with a pinch (a zooming ScrollView); the close control sits top right.
 */
function PhotoViewer({ source, ratio, visible, onClose }: { source: ImageSourcePropType; ratio: number | null; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, margin, touch } = useWindowLayout();
  const shape = ratio ?? 4 / 3;
  // Room under the close control and above the hint line.
  const band = touch + theme.spacing.lg;
  const photoWidth = Math.max(0, Math.min(width - margin * 2, (height - insets.top - insets.bottom - band * 2) * shape));
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + band, paddingBottom: insets.bottom + band }}
          maximumZoomScale={theme.layout.photoViewer.maxZoom}
          minimumZoomScale={1}
          bouncesZoom
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={source}
            resizeMode="contain"
            accessibilityLabel="Soru görseli"
            style={{ width: photoWidth, height: photoWidth / shape, borderRadius: theme.radius.md }}
          />
        </ScrollView>
        <PressableScale
          kind="bubble"
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          onPress={onClose}
          style={[
            elevated(theme, 'floating'),
            {
              position: 'absolute',
              top: insets.top + theme.spacing.md,
              right: margin,
              width: touch,
              height: touch,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Icon name="x" size={theme.layout.iconSize.md} color={theme.colors.text} />
        </PressableScale>
        {Platform.OS === 'ios' ? (
          <AppText variant="caption" color="textMuted" align="center" style={{ position: 'absolute', left: margin, right: margin, bottom: insets.bottom + theme.spacing.lg }}>
            İki parmakla yakınlaştır
          </AppText>
        ) : null}
      </View>
    </Modal>
  );
}
