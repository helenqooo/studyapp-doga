import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Login token storage: the iOS Keychain on device, localStorage in the browser preview
// (which may be unavailable, e.g. in a private window — then nothing is remembered).

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // not persisted
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // nothing stored
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
