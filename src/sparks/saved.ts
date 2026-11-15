import { normalizeText } from './history';
import type { Spark } from './types';
import { sparkProblems } from './validate';

/** Plenty for a personal list; keeps storage small. */
export const MAX_SAVED = 500;

function sameSpark(a: Spark, b: Spark): boolean {
  return a.id === b.id || normalizeText(a.text) === normalizeText(b.text);
}

export function isSaved(saved: readonly Spark[], spark: Spark): boolean {
  return saved.some((s) => sameSpark(s, spark));
}

/** Newest first; a spark already saved (by id or text) is not added twice. */
export function addSaved(saved: readonly Spark[], spark: Spark): Spark[] {
  if (isSaved(saved, spark)) return [...saved];
  return [spark, ...saved].slice(0, MAX_SAVED);
}

export function removeSaved(saved: readonly Spark[], spark: Spark): Spark[] {
  return saved.filter((s) => !sameSpark(s, spark));
}

export function toggleSaved(saved: readonly Spark[], spark: Spark): Spark[] {
  return isSaved(saved, spark) ? removeSaved(saved, spark) : addSaved(saved, spark);
}

/** Keep `first`, then append what `second` adds. */
export function mergeSaved(first: readonly Spark[], second: readonly Spark[]): Spark[] {
  return second
    .reduce<Spark[]>((list, spark) => (isSaved(list, spark) ? list : [...list, spark]), [...first])
    .slice(0, MAX_SAVED);
}

/** Stored JSON back to sparks: anything unreadable or invalid is dropped, never thrown. */
export function parseSaved(json: string | null): Spark[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const valid = data.filter(
    (item): item is Spark =>
      sparkProblems(item).length === 0 &&
      ((item as Spark).source === 'deck' || (item as Spark).source === 'ai'),
  );
  return mergeSaved([], valid);
}
