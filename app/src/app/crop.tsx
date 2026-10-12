import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSolve } from '../api/hooks';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { haptics } from '../lib/haptics';
import { prepareUpload, type LocalImage } from '../lib/image';
import { useSolveStore } from '../store/solveStore';
import { useTheme } from '../theme';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const WAIT_MESSAGES = [
  'Soru okunuyor…',
  'Konu belirleniyor…',
  'Çözüm hazırlanıyor…',
  'İpuçları yazılıyor…',
  'Son kontroller yapılıyor…',
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Where an image of size `img` lands when "contain"-fitted into `box`. */
function fitRect(img: LocalImage, box: { width: number; height: number }): Rect {
  const scale = Math.min(box.width / img.width, box.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  return { x: (box.width - w) / 2, y: (box.height - h) / 2, w, h };
}

export default function CropScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const image = useSolveStore((s) => s.pending);
  const rememberImage = useSolveStore((s) => s.rememberImage);
  const solve = useSolve();

  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [phase, setPhase] = useState<'edit' | 'preparing' | 'uploading' | 'solving' | 'error'>('edit');
  const [uploadPct, setUploadPct] = useState(0);
  const [waitIndex, setWaitIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const bounds = useMemo(() => (image && box ? fitRect(image, box) : null), [image, box]);
  const cropRef = useRef<Rect | null>(null);
  const boundsRef = useRef<Rect | null>(null);
  cropRef.current = crop;
  boundsRef.current = bounds;

  // Start with a crop box slightly inside the image. If the layout changes later (e.g. the
  // error banner appears), keep the user's crop by rescaling it into the new bounds.
  const prevBoundsRef = useRef<Rect | null>(null);
  useEffect(() => {
    if (!bounds) return;
    const prev = prevBoundsRef.current;
    prevBoundsRef.current = bounds;
    setCrop((current) => {
      if (current && prev) {
        const s = bounds.w / prev.w;
        return {
          x: bounds.x + (current.x - prev.x) * s,
          y: bounds.y + (current.y - prev.y) * s,
          w: current.w * s,
          h: current.h * s,
        };
      }
      const inset = Math.min(bounds.w, bounds.h) * 0.04;
      return { x: bounds.x + inset, y: bounds.y + inset, w: bounds.w - inset * 2, h: bounds.h - inset * 2 };
    });
  }, [bounds]);

  // Rotate the "still working" messages while Claude solves.
  useEffect(() => {
    if (phase !== 'solving') return;
    const id = setInterval(() => setWaitIndex((i) => (i + 1) % WAIT_MESSAGES.length), 3500);
    return () => clearInterval(id);
  }, [phase]);

  const responders = useMemo(() => {
    const make = (handle: Handle) => {
      let start: Rect | null = null;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start = cropRef.current;
          haptics.select();
        },
        onPanResponderMove: (_, g) => {
          const b = boundsRef.current;
          if (!start || !b) return;
          const min = theme.layout.cropMinSize;
          if (handle === 'move') {
            setCrop({
              ...start,
              x: clamp(start.x + g.dx, b.x, b.x + b.w - start.w),
              y: clamp(start.y + g.dy, b.y, b.y + b.h - start.h),
            });
            return;
          }
          let left = start.x;
          let top = start.y;
          let right = start.x + start.w;
          let bottom = start.y + start.h;
          if (handle === 'tl' || handle === 'bl') left = clamp(start.x + g.dx, b.x, right - min);
          if (handle === 'tr' || handle === 'br') right = clamp(right + g.dx, left + min, b.x + b.w);
          if (handle === 'tl' || handle === 'tr') top = clamp(start.y + g.dy, b.y, bottom - min);
          if (handle === 'bl' || handle === 'br') bottom = clamp(bottom + g.dy, top + min, b.y + b.h);
          setCrop({ x: left, y: top, w: right - left, h: bottom - top });
        },
        onPanResponderTerminationRequest: () => false,
      });
    };
    return { tl: make('tl'), tr: make('tr'), bl: make('bl'), br: make('br'), move: make('move') };
  }, [theme.layout.cropMinSize]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };

  const submit = async () => {
    if (!image || !crop || !bounds) return;
    const scale = image.width / bounds.w;
    try {
      setPhase('preparing');
      const upload = await prepareUpload(image, {
        originX: (crop.x - bounds.x) * scale,
        originY: (crop.y - bounds.y) * scale,
        width: crop.w * scale,
        height: crop.h * scale,
      });
      setUploadPct(0);
      setPhase('uploading');
      const question = await solve.mutateAsync({
        uri: upload.uri,
        onUploadProgress: (f) => {
          setUploadPct(Math.round(f * 100));
          if (f >= 1) setPhase('solving');
        },
      });
      rememberImage(question.id, upload);
      haptics.success();
      router.replace(`/question/${question.id}`);
    } catch (e) {
      haptics.error();
      setErrorMessage(e instanceof Error ? e.message : 'Bir şeyler ters gitti.');
      setPhase('error');
    }
  };

  const cancel = () => router.back();
  const retake = () => router.replace('/camera');

  if (!image) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.cameraBackground, justifyContent: 'center', padding: theme.spacing.xl }}>
        <Button label="Geri dön" onPress={cancel} />
      </View>
    );
  }

  const busy = phase === 'preparing' || phase === 'uploading' || phase === 'solving';
  const c = theme.colors;
  const cornerSize = theme.layout.cropHandle;
  const cornerMark = theme.spacing.xl;
  const cornerStroke = theme.spacing.xs;

  return (
    <View style={{ flex: 1, backgroundColor: c.cameraBackground }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + theme.spacing.sm, paddingHorizontal: theme.layout.screenPadding }}>
        <AppText variant="heading" tint={c.cameraForeground} align="center">
          {busy ? 'Çözülüyor' : 'Soruyu kırp'}
        </AppText>
        <AppText variant="label" tint={c.cameraForeground} align="center" style={{ opacity: 0.7 }}>
          {busy ? 'Bu biraz sürebilir.' : 'Köşeleri sürükle, sadece soru kalsın.'}
        </AppText>
      </View>

      <View style={{ flex: 1, margin: theme.spacing.lg }} onLayout={onLayout}>
        {bounds ? (
          <Image
            source={{ uri: image.uri }}
            resizeMode="stretch"
            style={{ position: 'absolute', left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}
          />
        ) : null}

        {crop && box ? (
          <>
            {/* Dim everything outside the crop box. */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, height: crop.y, backgroundColor: c.cameraScrim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: crop.y + crop.h, right: 0, bottom: 0, backgroundColor: c.cameraScrim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: crop.y, width: crop.x, height: crop.h, backgroundColor: c.cameraScrim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: crop.x + crop.w, top: crop.y, right: 0, height: crop.h, backgroundColor: c.cameraScrim }} />

            <View
              {...(busy ? {} : responders.move.panHandlers)}
              style={{
                position: 'absolute',
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h,
                borderWidth: theme.layout.borderWidth,
                borderColor: c.cropFrame,
              }}
            />

            {(['tl', 'tr', 'bl', 'br'] as const).map((h) => {
              const isLeft = h[1] === 'l';
              const isTop = h[0] === 't';
              const cx = isLeft ? crop.x : crop.x + crop.w;
              const cy = isTop ? crop.y : crop.y + crop.h;
              // The touch area is centered on the corner; the visible "L" starts at the
              // corner and extends into the crop box.
              const offset = cornerSize / 2 - cornerStroke;
              return (
                <View
                  key={h}
                  {...(busy ? {} : responders[h].panHandlers)}
                  style={{
                    position: 'absolute',
                    left: cx - cornerSize / 2,
                    top: cy - cornerSize / 2,
                    width: cornerSize,
                    height: cornerSize,
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      width: cornerMark,
                      height: cornerMark,
                      ...(isLeft ? { left: offset } : { right: offset }),
                      ...(isTop ? { top: offset } : { bottom: offset }),
                      borderColor: c.cropFrame,
                      borderTopWidth: isTop ? cornerStroke : 0,
                      borderBottomWidth: isTop ? 0 : cornerStroke,
                      borderLeftWidth: isLeft ? cornerStroke : 0,
                      borderRightWidth: isLeft ? 0 : cornerStroke,
                    }}
                  />
                </View>
              );
            })}
          </>
        ) : null}

        {busy ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.md,
            }}
          >
            <View
              style={{
                backgroundColor: c.cameraScrim,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xl,
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <ActivityIndicator size="large" color={c.cameraForeground} />
              <AppText variant="heading" tint={c.cameraForeground} align="center">
                {phase === 'preparing'
                  ? 'Görsel hazırlanıyor…'
                  : phase === 'uploading'
                    ? `Yükleniyor… %${uploadPct}`
                    : WAIT_MESSAGES[waitIndex]}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingBottom: insets.bottom + theme.spacing.lg,
          gap: theme.spacing.sm,
        }}
      >
        {phase === 'error' ? (
          <View style={{ backgroundColor: c.dangerSoft, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
            <AppText color="danger" align="center">
              {errorMessage}
            </AppText>
          </View>
        ) : null}
        <Button
          label={phase === 'error' ? 'Tekrar dene' : 'Çöz'}
          icon="sparkles"
          size="lg"
          loading={busy}
          disabled={!crop}
          onPress={submit}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button label="Yeniden çek" icon="camera" variant="neutral" onPress={retake} disabled={busy} style={{ flex: 1 }} />
          <Button label="Vazgeç" variant="neutral" onPress={cancel} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}
