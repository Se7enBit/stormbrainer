/**
 * Variety angles: each AI request gets one at random as inspiration, so batches don't all
 * circle the same topics. The prompt's work-safe rules still apply on top.
 */
export const ANGLES = [
  'food and cooking',
  'travel and trips',
  'childhood',
  'school days',
  'technology and gadgets',
  'work life and offices',
  'money-free hypotheticals',
  'pop culture',
  'films and TV',
  'music',
  'books and stories',
  'sport and games',
  'animals',
  'nature and the outdoors',
  'the future',
  'history',
  'science',
  'space',
  'cities and places',
  'holidays and traditions',
  'household habits',
  'fashion and style',
  'inventions',
  'superpowers',
  'time travel',
  'strange rules and laws',
  'manners and etiquette',
  'first times',
  'skills and talents',
  'hobbies',
  'weather and seasons',
  'the internet',
  'phones and apps',
  'getting around',
  'mornings and routines',
  'ethics-lite dilemmas',
  'friendship',
  'art and design',
  'languages and words',
  'the ocean',
  'small luxuries',
  'guilty pleasures',
  'mysteries and the unexplained',
  'shopping',
] as const;

/** A random angle, never `exclude` (used to retry with a different one). */
export function pickAngle(random: () => number = Math.random, exclude?: string): string {
  const choices = ANGLES.filter((angle) => angle !== exclude);
  const index = Math.min(Math.floor(random() * choices.length), choices.length - 1);
  return choices[index] ?? ANGLES[0];
}
