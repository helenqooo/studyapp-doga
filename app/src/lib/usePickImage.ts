import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
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

  return { openCamera, pickFromLibrary, busy };
}
