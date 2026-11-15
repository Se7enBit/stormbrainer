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
    comingSoon: 'Sparks you star will show up here. Saving arrives in a later milestone.',
  },
  settings: {
    title: 'Settings',
    comingSoon:
      'Bring-your-own-key AI sparks, the work-safe default and clearing history arrive in later milestones. Right now every spark comes from the offline deck.',
    version: 'Version',
  },
} as const;
