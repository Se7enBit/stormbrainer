import { useKeepAwake } from 'expo-keep-awake';

/** Keeps the screen on while mounted (a card is showing). Silently skipped where unsupported. */
export function KeepAwake() {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  return null;
}
