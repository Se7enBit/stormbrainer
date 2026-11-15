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
