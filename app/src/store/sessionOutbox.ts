import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinishedPhase } from './timerStore';

// Finished timer phases waiting to be saved (e.g. the phone was offline). The server
// stores each id once, so retrying is safe. Kept per account, so a session never ends up
// saved under someone else who signs in on the same device.

const key = (userId: string) => `derece.sessionOutbox.${userId}`;

export async function readOutbox(userId: string): Promise<FinishedPhase[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as FinishedPhase[]) : [];
  } catch {
    return [];
  }
}

export async function writeOutbox(userId: string, items: FinishedPhase[]): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(items)).catch(() => {});
}

export async function addToOutbox(userId: string, item: FinishedPhase): Promise<void> {
  await writeOutbox(userId, [...(await readOutbox(userId)), item]);
}
