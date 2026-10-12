import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Local notification at the end of a pomodoro phase (no push, works in Expo Go).
// The browser preview has no scheduled notifications; the in-app timer still runs.

const supported = Platform.OS !== 'web';

if (supported) {
  // In the foreground the app shows its own celebration; keep the notification in the list only.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function allowed(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const COPY = {
  focus: (minutes: number) => ({ title: 'Odak bitti', body: `${minutes} dakikayı tamamladın. Mola zamanı.` }),
  break: () => ({ title: 'Mola bitti', body: 'Hazırsan yeni bir odak başlat.' }),
};

/** Schedules the end-of-phase notification; returns its id (null if not allowed). */
export async function scheduleTimerNotification(kind: 'focus' | 'break', endsAt: number, minutes: number) {
  try {
    if (!(await allowed())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { ...(kind === 'focus' ? COPY.focus(minutes) : COPY.break()), sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt },
    });
  } catch {
    return null;
  }
}

export async function cancelTimerNotification(id: string | null) {
  if (!supported || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
