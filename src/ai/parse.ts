import { normalizeText } from '../sparks/history';
import { SPARK_TYPES, type Spark, type SparkRequest, type SparkType } from '../sparks/types';
import { OPTIONS_ALLOWED, sparkProblems } from '../sparks/validate';
import { AiError } from './provider';

type ParseRequest = Pick<SparkRequest, 'types' | 'vibe' | 'workSafe' | 'avoid'>;

/** Strip what models like to add: surrounding quotes, list numbering, extra whitespace. */
export function cleanLine(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(\d+[.)]|[-*•])\s+/, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();
}

function asOptions(value: unknown): [string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [a, b] = value.map((o) => (typeof o === 'string' ? cleanLine(o) : ''));
  return a && b ? [a, b] : undefined;
}

/**
 * Turn the model's JSON text into valid sparks. Invalid JSON throws AiError('badResponse');
 * invalid items are dropped, as are repeats of the avoid list or of each other. May return
 * an empty list (the caller treats that like a blocked response).
 */
export function parseSparks(json: string, request: ParseRequest, newId: () => string): Spark[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new AiError('badResponse');
  }
  const items: unknown[] = Array.isArray(data)
    ? data
    : typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { sparks?: unknown }).sparks)
      ? (data as { sparks: unknown[] }).sparks
      : [];

  const seen = new Set(request.avoid.map(normalizeText));
  const sparks: Spark[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const type = raw.type as SparkType;
    if (!SPARK_TYPES.includes(type) || !request.types.includes(type)) continue;
    if (typeof raw.text !== 'string') continue;

    const text = cleanLine(raw.text);
    const options = OPTIONS_ALLOWED.includes(type) ? asOptions(raw.options) : undefined;
    const spark: Spark = {
      id: newId(),
      type,
      text,
      ...(options && { options }),
      source: 'ai',
      vibe: request.vibe,
      workSafe: request.workSafe,
    };
    if (sparkProblems(spark).length > 0) continue;

    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    sparks.push(spark);
  }
  return sparks;
}
