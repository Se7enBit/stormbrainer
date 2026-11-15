import { MAX_SPARK_TEXT, SPARK_TYPES, VIBES, type SparkType, type Vibe } from './types';

/** Types whose card shows two options: required for debate, optional for what-if (would-you-rather). */
export const OPTIONS_REQUIRED: readonly SparkType[] = ['debate'];
export const OPTIONS_ALLOWED: readonly SparkType[] = ['debate', 'whatIf'];

/**
 * Problems with one spark (deck entry or AI output), empty when it is valid. Checks shape and the
 * content rules code can check (length, no emojis, no numbering); tone is up to the writer.
 */
export function sparkProblems(entry: unknown): string[] {
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
