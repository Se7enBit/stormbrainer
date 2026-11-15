import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/** The browser's install prompt event (Chrome/Edge); not in the DOM typings. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** The bits of `window` this needs, so tests can pass a fake. */
export interface InstallWindow {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { standalone?: boolean; userAgent?: string };
  /** Caught by the inline script in public/index.html before the app loaded. */
  __installPrompt?: Event;
}

export interface InstallState {
  /** Running as an installed app already (or just installed). */
  installed: boolean;
  /** The browser offered its own install prompt. */
  canPrompt: boolean;
  /** iPhone/iPad Safari: no prompt, the steps differ. */
  ios: boolean;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/**
 * Tracks whether the web app can be installed. The browser fires `beforeinstallprompt`
 * early, so this must be created at startup, not when the banner mounts.
 */
export function createInstallController(win: InstallWindow) {
  let deferred: InstallPromptEvent | null = null;
  const listeners = new Set<() => void>();
  const standalone =
    Boolean(win.matchMedia?.('(display-mode: standalone)').matches) ||
    win.navigator?.standalone === true;
  let state: InstallState = {
    installed: standalone,
    canPrompt: false,
    ios: /iphone|ipad|ipod/i.test(win.navigator?.userAgent ?? ''),
  };

  const update = (next: Partial<InstallState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  if (win.__installPrompt && !standalone) {
    deferred = win.__installPrompt as InstallPromptEvent;
    state = { ...state, canPrompt: true };
  }

  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // Show our own button instead of the mini-infobar.
    deferred = event as InstallPromptEvent;
    update({ canPrompt: true });
  });
  win.addEventListener('appinstalled', () => {
    deferred = null;
    update({ installed: true, canPrompt: false });
  });

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Opens the browser's install prompt if it offered one. */
    async prompt(): Promise<InstallOutcome> {
      if (!deferred) return 'unavailable';
      const event = deferred;
      deferred = null; // A prompt event can only be used once.
      update({ canPrompt: false });
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'accepted') update({ installed: true });
      return outcome;
    },
  };
}

type InstallController = ReturnType<typeof createInstallController>;

const NOT_WEB: InstallState = { installed: true, canPrompt: false, ios: false };

/** Web only: created at import, so the early browser event is not missed. */
const controller: InstallController | null =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? createInstallController(window as unknown as InstallWindow)
    : null;

const noop = () => () => {};

export function useInstall(): InstallState & { prompt: () => Promise<InstallOutcome> } {
  const state = useSyncExternalStore(
    controller?.subscribe ?? noop,
    controller?.getState ?? (() => NOT_WEB),
  );
  return { ...state, prompt: controller?.prompt ?? (async () => 'unavailable') };
}
