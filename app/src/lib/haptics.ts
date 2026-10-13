import * as Haptics from 'expo-haptics';
import { usePrefsStore } from '../store/prefsStore';
import { motion } from '../theme';

// Haptics are fire-and-forget; failures (e.g. simulator) are irrelevant.
const ignore = () => {};

/** Runs a haptic only while the student has vibration on (Profil → Lumi → Titreşim). */
const when = (fire: () => Promise<void>) => () => {
  if (!usePrefsStore.getState().haptics) return;
  fire().catch(ignore);
};

const selection = () => Haptics.selectionAsync();

/** Every haptic in the app goes through here (section 5.5 of the design spec maps moments to these). */
export const haptics = {
  /** Primary button press, tapping Lumi. */
  tap: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Long-press Çöz → camera, long-press Lumi. */
  press: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Kodla (submitting an answer), a level-up or badge stamp. */
  rigid: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  /** All of today's goals done (twice). */
  soft: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** Tabs, chips, segments, steppers, chart scrubbing; a blank verdict. */
  select: when(selection),
  /** A–E letters and goal rows: two selection ticks, like a pencil on paper. */
  grain: when(
    () =>
      new Promise<void>((resolve) => {
        selection().catch(ignore);
        setTimeout(() => {
          selection().catch(ignore);
          resolve();
        }, motion.grainGap);
      }),
  ),
  success: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
