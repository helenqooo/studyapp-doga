import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { armNextSample } from '../api/demo/demoApi';
import { useSolveStore } from '../store/solveStore';
import { normalizeImage } from './image';

/** Entry points into the solve flow: camera screen or the photo library, both ending on /crop. */
export function usePickImage() {
  const setPending = useSolveStore((s) => s.setPending);
  const [busy, setBusy] = useState(false);

  const openCamera = () => router.push('/camera');

  /** `replace: true` swaps the current screen (used from the camera modal) instead of pushing. */
  const pickFromLibrary = async ({ replace = false }: { replace?: boolean } = {}) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      setPending(await normalizeImage(asset.uri));
      if (replace) router.replace('/crop');
      else router.push('/crop');
    } catch {
      Alert.alert('Görsel açılamadı', 'Başka bir görsel seçmeyi dene.');
    } finally {
      setBusy(false);
    }
  };

  /** Demo mode: opens the crop screen with a bundled sample question. */
  const trySample = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const sample = armNextSample();
      const src = sample.image.source;
      let uri: string;
      if (typeof src === 'number') {
        const asset = Asset.fromModule(src);
        await asset.downloadAsync();
        uri = asset.localUri ?? asset.uri;
      } else {
        uri = src.uri;
      }
      setPending({ uri, width: sample.image.width, height: sample.image.height });
      router.push('/crop');
    } catch {
      Alert.alert('Örnek soru açılamadı', 'Tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return { openCamera, pickFromLibrary, trySample, busy };
}
