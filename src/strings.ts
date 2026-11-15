import type { AiErrorKind } from './ai/provider';
import type { SparkType, Vibe } from './sparks/types';

/** All UI text lives here (English only for now; one file so other languages can come later). */
export const strings = {
  appName: 'Stormbrainer',
  nav: {
    saved: 'Saved',
    settings: 'Settings',
  },
  home: {
    sparkButton: 'Spark',
    sparkHint: 'Tap for something to talk about',
    controlsLabel: 'Spark settings',
    typesLabel: 'Types',
    vibeLabel: 'Vibe',
    contextAdd: 'Add group context',
    contextLabel: 'Group context',
    contextPlaceholder: 'e.g. old uni friends at a cabin',
    contextDone: 'Done',
    aiNeedsAttention: 'AI sparks are paused: check your key in Settings.',
  },
  types: {
    debate: 'Debate',
    hotTake: 'Hot take',
    memoryLane: 'Memory lane',
    whatIf: 'What if',
  } satisfies Record<SparkType, string>,
  vibes: {
    light: 'Light',
    deep: 'Deep',
    spicy: 'Spicy',
  } satisfies Record<Vibe, string>,
  workSafe: 'Work-safe',
  card: {
    next: 'Next',
    reroll: 'Reroll',
    close: 'Close',
    offlineBadge: 'offline deck',
    versus: 'vs',
    or: 'or',
    hotTakeHint: 'Agree or disagree?',
    memoryLaneHint: 'Who has a story?',
    save: 'Save spark',
    unsave: 'Remove from saved',
  },
  /** Friendly messages for AI failures. Never include the key or raw responses. */
  aiErrors: {
    invalidKey: 'That API key was not accepted. Check it in Google AI Studio and paste it again.',
    modelNotFound:
      'That model id was not found. Check it under Advanced, or clear it to use the default.',
    quota: 'The free AI quota is used up for now, so sparks come from the offline deck.',
    network: 'Could not reach the AI, so sparks come from the offline deck.',
    blocked: 'The AI did not return usable sparks, so sparks come from the offline deck.',
    badResponse: 'The AI sent something unexpected, so sparks come from the offline deck.',
  } satisfies Record<AiErrorKind, string>,
  saved: {
    title: 'Saved',
    empty: 'Nothing saved yet. Tap ☆ on a card to keep it here.',
    hint: 'Tap a spark to show it again. Long-press to delete it.',
    delete: 'Delete',
    cancel: 'Cancel',
  },
  settings: {
    title: 'Settings',
    keySection: 'Gemini API key',
    keyIntro:
      'Paste your own Google AI Studio key for fresh AI sparks. Without a key, sparks come from the offline deck.',
    keyInputLabel: 'API key',
    keyPlaceholder: 'Paste your API key',
    saveKey: 'Save key',
    testKey: 'Test key',
    removeKey: 'Remove key',
    getKey: 'Get a free key in Google AI Studio',
    keySaved: 'A key is saved.',
    storedNative: 'It is stored securely on this device only.',
    storedWeb: 'It is stored in this browser, on this device only.',
    keyStatus: {
      saved: 'Not tested yet.',
      testing: 'Testing…',
      ok: 'The key works. Sparks now come from Gemini.',
    },
    advanced: 'Advanced',
    modelLabel: 'Model id',
    modelHint: 'Leave blank to use the default.',
    sparksSection: 'Sparks',
    workSafeDefault: 'Work-safe by default',
    workSafeDefaultHint: 'Start with the work-safe toggle on, for team lunches and offsites.',
    clearHistory: 'Clear history',
    historyCleared: 'History cleared: every spark can come up again.',
    about: 'About',
    privacy:
      'There is no Stormbrainer server: AI requests go straight from this device to Google. On the Gemini free tier, Google may use prompts to improve its products, so keep anything sensitive out of the group context.',
    version: 'Version',
  },
} as const;
