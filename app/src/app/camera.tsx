import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { haptics } from '../lib/haptics';
import { normalizeImage } from '../lib/image';
import { usePickImage } from '../lib/usePickImage';
import { useSolveStore } from '../store/solveStore';
import { useTheme } from '../theme';

function RoundButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={theme.spacing.sm}
      style={{
        width: theme.layout.minTouch,
        height: theme.layout.minTouch,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.cameraForeground : theme.colors.cameraScrim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} color={active ? theme.colors.cameraBackground : theme.colors.cameraForeground} />
    </Pressable>
  );
}

export default function CameraScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // 3:4 guide that fits the space between the top buttons and the shutter row, in any orientation.
  const chrome = insets.top + insets.bottom + theme.layout.shutterSize + theme.layout.minTouch * 3;
  const frameWidth = Math.min(window.width * theme.layout.cameraFrameShare, (window.height - chrome) * (3 / 4));
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
        <Icon name="camera.fill" size={theme.layout.iconSize.xl} color={theme.colors.primary} style={{ alignSelf: 'center' }} />
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
        <RoundButton icon="xmark" label="Kapat" onPress={close} />
        <RoundButton
          icon={torch ? 'flashlight.on.fill' : 'flashlight.off.fill'}
          label="Fener"
          active={torch}
          onPress={() => setTorch((t) => !t)}
        />
      </View>

      <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: frameWidth,
            aspectRatio: 3 / 4,
            borderWidth: theme.layout.frameBorder,
            borderColor: theme.colors.cropFrame,
            borderRadius: theme.radius.lg,
            opacity: 0.7,
          }}
        />
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
        <RoundButton icon="photo.on.rectangle" label="Galeriden seç" onPress={fromLibrary} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf çek"
          onPress={capture}
          disabled={capturing}
          style={({ pressed }) => ({
            width: theme.layout.shutterSize,
            height: theme.layout.shutterSize,
            borderRadius: theme.radius.pill,
            borderWidth: theme.layout.shutterBorder,
            borderColor: theme.colors.cameraForeground,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          {capturing ? (
            <ActivityIndicator color={theme.colors.cameraForeground} />
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
        </Pressable>
        <View style={{ width: theme.layout.minTouch }} />
      </View>
    </View>
  );
}
