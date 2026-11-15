import rawDeck from './deck.json';
import { forget, hasSeen, recordShown, type History } from './history';
import {
  MAX_SPARK_TEXT,
  SPARK_TYPES,
  VIBES,
  type Spark,
  type SparkFilters,
  type SparkType,
  type Vibe,
} from './types';

/** Shape of one entry in deck.json (a Spark without `source`). */
export interface DeckEntry {
  id: string;
  type: SparkType;
  vibe: Vibe;
  workSafe: boolean;
  text: string;
  options?: [string, string];
}

/** Types whose card shows two options: required for debate, optional for what-if (would-you-rather). */
const OPTIONS_REQUIRED: readonly SparkType[] = ['debate'];
const OPTIONS_ALLOWED: readonly SparkType[] = ['debate', 'whatIf'];

/**
 * Problems with one deck entry, empty when it is valid. Checks shape and the content rules
 * a test can check (length, no emojis, no numbering); tone is up to the writer.
 */
export function deckEntryProblems(entry: unknown): string[] {
  if (typeof entry !== 'object' || entry === null) return ['not an object'];
  const e = entry as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof e.id !== 'string' || e.id === '') problems.push('missing id');
  if (!SPARK_TYPES.includes(e.type as SparkType)) problems.push(`bad type ${String(e.type)}`);
  if (!VIBES.includes(e.vibe as Vibe)) problems.push(`bad vibe ${String(e.vibe)}`);
  if (typeof e.workSafe !== 'boolean') problems.push('missing workSafe');
  if (typeof e.text !== 'string' || e.text.trim() === '') {
    problems.push('missing text');
  } else {
    if (e.text.length > MAX_SPARK_TEXT) problems.push(`text over ${MAX_SPARK_TEXT} chars`);
    if (/\p{Extended_Pictographic}/u.test(e.text)) problems.push('emoji in text');
    if (/^\s*(\d+|[a-z])[.)]\s/i.test(e.text)) problems.push('numbered text');
  }
  const type = e.type as SparkType;
  if (e.options === undefined) {
    if (OPTIONS_REQUIRED.includes(type)) problems.push('missing options');
  } else if (!OPTIONS_ALLOWED.includes(type)) {
    problems.push(`options not allowed for ${type}`);
  } else if (
    !Array.isArray(e.options) ||
    e.options.length !== 2 ||
    !e.options.every((o) => typeof o === 'string' && o.trim() !== '')
  ) {
    problems.push('options must be two non-empty strings');
  }
  return problems;
}

/** The bundled offline deck. deck.test.ts validates every entry. */
export const deck: readonly Spark[] = (rawDeck as DeckEntry[]).map((entry) => ({
  ...entry,
  source: 'deck',
}));

export function matchesFilters(spark: Spark, filters: SparkFilters): boolean {
  return (
    filters.types.includes(spark.type) &&
    spark.vibe === filters.vibe &&
    (!filters.workSafe || spark.workSafe)
  );
}

/**
 * Sparks that may be drawn for these filters. If the vibe leaves nothing, the vibe is relaxed;
 * the types and work-safe never are.
 */
export function deckPool(sparks: readonly Spark[], filters: SparkFilters): Spark[] {
  const strict = sparks.filter((s) => matchesFilters(s, filters));
  if (strict.length > 0) return strict;
  return sparks.filter((s) => filters.types.includes(s.type) && (!filters.workSafe || s.workSafe));
}

export interface Draw {
  spark: Spark;
  history: History;
}

/**
 * Draw without replacement: a uniform pick among the pool's unseen sparks, which is the same as
 * walking a shuffled pool. When every spark in the pool has been seen, a new cycle starts
 * (avoiding an immediate repeat of `current`). Returns null only if the pool is empty.
 */
export function drawFromDeck(
  sparks: readonly Spark[],
  filters: SparkFilters,
  history: History,
  random: () => number = Math.random,
  current: Spark | null = null,
): Draw | null {
  const pool = deckPool(sparks, filters);
  if (pool.length === 0) return null;

  let nextHistory = history;
  let candidates = pool.filter((s) => !hasSeen(nextHistory, s));
  if (candidates.length === 0) {
    nextHistory = forget(nextHistory, pool);
    candidates = pool.length > 1 ? pool.filter((s) => s.id !== current?.id) : pool;
  }

  const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
  const spark = candidates[index];
  if (!spark) return null;
  return { spark, history: recordShown(nextHistory, spark) };
}
