import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinishedPhase } from './timerStore';

// Finished timer phases waiting to be saved (e.g. the phone was offline). The server
// stores each id once, so retrying is safe.

const KEY = 'derece.sessionOutbox';

export async function readOutbox(): Promise<FinishedPhase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FinishedPhase[]) : [];
  } catch {
    return [];
  }
}

export async function writeOutbox(items: FinishedPhase[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
}
