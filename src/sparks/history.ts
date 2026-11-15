import type { Spark } from './types';

/** How many recent texts to keep for the AI "do not repeat" list. */
export const RECENT_TEXTS_LIMIT = 30;

/**
 * What has been shown this session. Immutable: every update returns a new object,
 * so it can live in a store as plain state.
 */
export interface History {
  /** Ids of sparks shown in the current cycle. */
  seenIds: readonly string[];
  /** Hashes of normalized texts shown in the current cycle. */
  seenHashes: readonly string[];
  /** Most recent texts first, at most RECENT_TEXTS_LIMIT. Kept across cycles. */
  recentTexts: readonly string[];
}

export const emptyHistory: History = { seenIds: [], seenHashes: [], recentTexts: [] };

/** Lowercase, strip punctuation and collapse whitespace, so near-identical texts compare equal. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** FNV-1a 32-bit hash of the normalized text, as hex. Short and stable; not cryptographic. */
export function hashText(text: string): string {
  const normalized = normalizeText(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hasSeen(history: History, spark: Spark): boolean {
  return history.seenIds.includes(spark.id) || history.seenHashes.includes(hashText(spark.text));
}

export function recordShown(history: History, spark: Spark): History {
  return {
    seenIds: [...history.seenIds, spark.id],
    seenHashes: [...history.seenHashes, hashText(spark.text)],
    recentTexts: [spark.text, ...history.recentTexts.filter((t) => t !== spark.text)].slice(
      0,
      RECENT_TEXTS_LIMIT,
    ),
  };
}

/** Start a new cycle for these sparks: they may be shown again. Recent texts are kept. */
export function forget(history: History, sparks: readonly Spark[]): History {
  const ids = new Set(sparks.map((s) => s.id));
  const hashes = new Set(sparks.map((s) => hashText(s.text)));
  return {
    seenIds: history.seenIds.filter((id) => !ids.has(id)),
    seenHashes: history.seenHashes.filter((h) => !hashes.has(h)),
    recentTexts: history.recentTexts,
  };
}
