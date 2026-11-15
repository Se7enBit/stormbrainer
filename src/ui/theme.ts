import type { SparkType } from '../sparks/types';

export const colors = {
  background: '#0B0F1A',
  surface: '#161C2C',
  surfaceRaised: '#20283D',
  border: '#2E3854',
  text: '#F5F7FA',
  textMuted: '#9AA4BF',
  accent: '#FFD43B',
  onAccent: '#0B0F1A',
} as const;

/** One accent per spark type, for the card label and chips. */
export const typeColors: Record<SparkType, string> = {
  debate: '#5CC8FF',
  hotTake: '#FF7A59',
  memoryLane: '#C49BFF',
  whatIf: '#6EE7A8',
  idea: '#F472B6',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Readable across a table: never below this. */
export const MIN_CARD_FONT_SIZE = 28;

/**
 * Card text size by length: big for short lines, shrinking for long ones but never below
 * MIN_CARD_FONT_SIZE. The text wraps and scrolls instead of being truncated.
 */
export function cardFontSize(text: string): number {
  const length = text.length;
  if (length <= 50) return 44;
  if (length <= 90) return 38;
  if (length <= 130) return 32;
  return MIN_CARD_FONT_SIZE;
}
