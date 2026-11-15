import rawDeck from './deck.json';
import { forget, hasSeen, recordShown, type History } from './history';
import type { Spark, SparkFilters, SparkType, Vibe } from './types';

/** Shape of one entry in deck.json (a Spark without `source`). */
export interface DeckEntry {
  id: string;
  type: SparkType;
  vibe: Vibe;
  workSafe: boolean;
  text: string;
  options?: [string, string];
}

/** The bundled offline deck. deck.test.ts validates every entry with sparkProblems. */
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
