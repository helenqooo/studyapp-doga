import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { Loader } from '../components/motion/Loader';
import { PressableScale } from '../components/motion/PressableScale';
import { ease } from '../components/motion/presets';
import { haptics } from '../lib/haptics';
import { normalizeImage } from '../lib/image';
import { useWindowLayout } from '../lib/layout';
import { usePickImage } from '../lib/usePickImage';
import { useSolveStore } from '../store/solveStore';
import { useTheme } from '../theme';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.viewfinder.stroke = 3 (spec 3 Viewfinder corners; the same const lives in Viewfinder.tsx)
const CORNER_STROKE = 3;
// TOKEN-PENDING: layout.viewfinder.cameraArm = 36 (the corner arms on the full-screen camera guide)
const CAMERA_ARM = 36;
// TOKEN-PENDING: layout.cameraGuideRatio = 0.75 (the guide is a 3:4 page, width over height)
const GUIDE_RATIO = 3 / 4;

/**
 * A round control on the camera: a scrim disc, lit white while on. The fill and the icon
 * (its color and, with `activeIcon`, its glyph) cross-fade instead of cutting (rule 0.7).
 */
function RoundButton({
  icon,
  activeIcon,
  label,
  onPress,
  active,
}: {
  icon: IconName;
  activeIcon?: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const c = theme.colors;
  const on = !!active;
  const bg = on ? c.cameraForeground : c.cameraScrim;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: withTiming(bg, fade) }), [bg, reduceMotion]);
  const offStyle = useAnimatedStyle(() => ({ opacity: withTiming(on ? 0 : 1, fade) }), [on, reduceMotion]);
  const onStyle = useAnimatedStyle(() => ({ opacity: withTiming(on ? 1 : 0, fade) }), [on, reduceMotion]);
  // 44 on a phone, 48 on a tablet (`layout.system.touch`).
  const size = useWindowLayout().touch;
  return (
    <PressableScale
      kind="bubble"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      onPress={onPress}
      hitSlop={theme.spacing.sm}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: theme.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
          },
          fillStyle as unknown as ViewStyle,
        ]}
      >
        {active === undefined ? (
          <Icon name={icon} color={c.cameraForeground} />
        ) : (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, offStyle]}>
              <Icon name={icon} color={c.cameraForeground} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, onStyle]}>
              <Icon name={activeIcon ?? icon} color={c.cameraBackground} />
            </Animated.View>
          </>
        )}
      </Animated.View>
    </PressableScale>
  );
}

/** The framing guide: the Viewfinder's four L-corners, in camera white at the guide opacity. */
function GuideCorners({ width }: { width: number }) {
  const theme = useTheme();
  const stroke = CORNER_STROKE;
  const r = theme.radius.sm;
  const corner = (v: 'top' | 'bottom', hz: 'left' | 'right') => (
    <View
      key={v + hz}
      style={{
        position: 'absolute',
        [v]: 0,
        [hz]: 0,
        width: CAMERA_ARM,
        height: CAMERA_ARM,
        borderColor: theme.colors.cameraForeground,
        [v === 'top' ? 'borderTopWidth' : 'borderBottomWidth']: stroke,
        [hz === 'left' ? 'borderLeftWidth' : 'borderRightWidth']: stroke,
        [`border${v === 'top' ? 'Top' : 'Bottom'}${hz === 'left' ? 'Left' : 'Right'}Radius`]: r,
      }}
    />
  );
  return (
    <View style={{ width, aspectRatio: GUIDE_RATIO, opacity: theme.opacity.cameraGuide }}>
      {corner('top', 'left')}
      {corner('top', 'right')}
      {corner('bottom', 'left')}
      {corner('bottom', 'right')}
    </View>
  );
}

export default function CameraScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { touch } = useWindowLayout();
  // 3:4 guide that fits the space between the top buttons and the shutter row, in any orientation.
  const chrome = insets.top + insets.bottom + theme.layout.shutterSize + touch * 3;
  const frameWidth = Math.min(window.width * theme.layout.cameraFrameShare, (window.height - chrome) * GUIDE_RATIO);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const setPending = useSolveStore((s) => s.setPending);
  const { pickFromLibrary } = usePickImage();

  const close = () => router.back();

  const capture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    haptics.press();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setPending(await normalizeImage(photo.uri));
      router.replace('/crop');
    } catch {
      Alert.alert('Fotoğraf çekilemedi', 'Tekrar dene.');
      setCapturing(false);
    }
  };

  const fromLibrary = () => pickFromLibrary({ replace: true });

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.cameraBackground }} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.layout.screenPadding,
          paddingTop: insets.top + theme.spacing.xxl,
          gap: theme.spacing.lg,
          justifyContent: 'center',
        }}
      >
        <Icon name="camera" size={theme.layout.iconSize.xl} color={theme.colors.primaryText} style={{ alignSelf: 'center' }} />
        <AppText variant="heading" align="center">
          Kamera izni gerekli
        </AppText>
        <AppText color="textMuted" align="center">
          Soruların fotoğrafını çekebilmek için kameraya erişim izni ver.
        </AppText>
        {permission.canAskAgain ? (
          <Button label="İzin ver" onPress={requestPermission} />
        ) : (
          <Button label="Ayarları aç" onPress={() => Linking.openSettings()} />
        )}
        <Button label="Vazgeç" variant="ghost" onPress={close} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.cameraBackground }}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />

      <View
        style={{
          position: 'absolute',
          top: insets.top + theme.spacing.sm,
          left: theme.layout.screenPadding,
          right: theme.layout.screenPadding,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <RoundButton icon="x" label="Kapat" onPress={close} />
        <RoundButton icon="flashlight-off" activeIcon="flashlight" label="Fener" active={torch} onPress={() => setTorch((t) => !t)} />
      </View>

      <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GuideCorners width={frameWidth} />
        <View
          style={{
            marginTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.cameraScrim,
          }}
        >
          <AppText variant="label" tint={theme.colors.cameraForeground}>
            Soruyu çerçeveye al
          </AppText>
        </View>
      </View>

      <View
        style={{
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingTop: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xxl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <RoundButton icon="images" label="Galeriden seç" onPress={fromLibrary} />
        <PressableScale
          kind="button"
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf çek"
          accessibilityState={{ busy: capturing }}
          onPress={capture}
          disabled={capturing}
          style={{
            width: theme.layout.shutterSize,
            height: theme.layout.shutterSize,
            borderRadius: theme.radius.pill,
            borderWidth: theme.layout.shutterBorder,
            borderColor: theme.colors.cameraForeground,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {capturing ? (
            <Loader color={theme.colors.cameraForeground} />
          ) : (
            <View
              style={{
                width: theme.layout.shutterSize - theme.spacing.lg,
                height: theme.layout.shutterSize - theme.spacing.lg,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.cameraForeground,
              }}
            />
          )}
        </PressableScale>
        <View style={{ width: touch }} />
      </View>
    </View>
  );
}
