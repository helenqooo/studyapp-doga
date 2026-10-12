import * as Haptics from 'expo-haptics';

// Haptics are fire-and-forget; failures (e.g. simulator) are irrelevant.
const ignore = () => {};

export const haptics = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore),
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore),
  select: () => Haptics.selectionAsync().catch(ignore),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore),
};
