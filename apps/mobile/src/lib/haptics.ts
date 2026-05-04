import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback. Wrapped so we can:
 *   - silently no-op on platforms that don't support it (no exceptions)
 *   - centralize the "intensity" to match brand feel
 *
 * Convention:
 *   - `tap`: any primary button or list-row press
 *   - `success`: positive confirmation (transaction added, etc.)
 *   - `warn`: yellow-flag actions (budget over, retry needed)
 *   - `error`: destructive/failed actions
 */

const safe = async (fn: () => Promise<unknown>): Promise<void> => {
  try {
    await fn();
  } catch {
    /* swallow on unsupported platforms */
  }
};

export const haptics = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: () => safe(() => Haptics.selectionAsync()),
};
