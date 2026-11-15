export const SPARK_TYPES = ['debate', 'hotTake', 'memoryLane', 'whatIf'] as const;
export type SparkType = (typeof SPARK_TYPES)[number];

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
  /** One line, at most 100 chars. Used only by AI mode. */
  context?: string;
  angle: string;
  /** Recently shown texts the model must not repeat. */
  avoid: string[];
  count: number;
}
