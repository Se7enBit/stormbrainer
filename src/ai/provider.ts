import type { Spark, SparkRequest } from '../sparks/types';

/**
 * Every way an AI call can fail, mapped to what the app does about it:
 * - invalidKey: a clear message in Settings (the key was rejected).
 * - modelNotFound: a clear message in Settings (the model id in Advanced is wrong).
 * - quota (429), network, badResponse: silent fallback to the offline deck.
 * - blocked: blocked or empty output; retry once with a new angle, then fall back.
 */
export const AI_ERROR_KINDS = [
  'invalidKey',
  'modelNotFound',
  'quota',
  'network',
  'blocked',
  'badResponse',
] as const;
export type AiErrorKind = (typeof AI_ERROR_KINDS)[number];

/**
 * An AI failure. Carries only the kind and HTTP status: never the key, the request or the raw
 * response, so it is always safe to show or log.
 */
export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly status?: number;

  constructor(kind: AiErrorKind, status?: number) {
    super(status === undefined ? `AI error: ${kind}` : `AI error: ${kind} (HTTP ${status})`);
    this.name = 'AiError';
    this.kind = kind;
    this.status = status;
  }
}

export function isAiError(error: unknown): error is AiError {
  return error instanceof AiError;
}

/** The only way the app talks to an AI. Gemini is one implementation. */
export interface AiProvider {
  /** One request for `request.count` sparks. Throws AiError; may return fewer than asked. */
  generateSparks(request: SparkRequest): Promise<Spark[]>;
  /** Cheap check that the key (and model) work. Resolves or throws AiError. */
  testKey(): Promise<void>;
}
