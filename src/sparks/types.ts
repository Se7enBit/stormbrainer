/** Every kind of card. Each belongs to exactly one mode (MODE_TYPES). */
export const SPARK_TYPES = ['debate', 'hotTake', 'memoryLane', 'whatIf', 'idea'] as const;
export type SparkType = (typeof SPARK_TYPES)[number];

/** What the big button gives (SPEC §9). */
export const MODES = ['sparks', 'brainstorm'] as const;
export type Mode = (typeof MODES)[number];

/** The card types of each mode. Sparks' types are the type chips; other modes have one type. */
export const MODE_TYPES: Record<Mode, readonly SparkType[]> = {
  sparks: ['debate', 'hotTake', 'memoryLane', 'whatIf'],
  brainstorm: ['idea'],
};

export function modeOf(type: SparkType): Mode {
  return MODES.find((mode) => MODE_TYPES[mode].includes(type)) ?? 'sparks';
}

export const VIBES = ['light', 'deep', 'spicy'] as const;
export type Vibe = (typeof VIBES)[number];

/** Max length of a spark's main line, so it reads aloud in one breath and fits on a card. */
export const MAX_SPARK_TEXT = 160;

export interface Spark {
  /** Deck id or generated uuid. */
  id: string;
  type: SparkType;
  /** Main line, at most MAX_SPARK_TEXT chars. */
  text: string;
  /** Debate sides or would-you-rather choices. */
  options?: [string, string];
  source: 'deck' | 'ai';
  vibe: Vibe;
  workSafe: boolean;
}

/** The chip settings a spark must match. */
export interface SparkFilters {
  /** Never empty: "all types" is every type selected. */
  types: SparkType[];
  vibe: Vibe;
  workSafe: boolean;
}

export interface SparkRequest extends SparkFilters {
  mode: Mode;
  /** Sparks: one line about the group, at most 100 chars. Used only by AI. */
  context?: string;
  /** Brainstorm: what to brainstorm about, at most 100 chars. Used only by AI. */
  topic?: string;
  angle: string;
  /** Recently shown texts the model must not repeat. */
  avoid: string[];
  count: number;
}
