import * as Haptics from 'expo-haptics';

/** A short buzz when a spark is drawn. Best effort: does nothing where unsupported. */
export function sparkHaptic(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // Not available on this device or browser.
  }
}
