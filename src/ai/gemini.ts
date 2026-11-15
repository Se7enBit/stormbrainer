import { SPARK_TYPES, type Spark, type SparkRequest } from '../sparks/types';
import { parseSparks } from './parse';
import { buildGenerateContentBody, type ThinkingLevel } from './prompt';
import { AiError, type AiErrorKind, type AiProvider } from './provider';

/**
 * The model names live here and nowhere else (Settings → Advanced can override the first).
 * Free-tier models change: when touching these, confirm in Google AI Studio that they are
 * still on the free tier. Last checked 2026-11-15.
 *
 * Default: a Flash-Lite model. Sparks are short, and on the free tier gemini-3.8-flash was
 * too slow (no answer within 60 s on a real phone) while Flash-Lite is built for low latency.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
/** Tried automatically when the chosen model is slow, overloaded, out of quota or missing. */
export const BACKUP_GEMINI_MODEL = 'gemini-3.8-flash';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
/** Where users create a key (linked from Settings). */
export const API_KEY_URL = 'https://aistudio.google.com/apikey';
/** Per model. Generous, but leaves time for the backup model; taps never wait this long. */
const DEFAULT_TIMEOUT_MS = 40_000;
/** Caps a runaway answer (5 short sparks need a few hundred tokens). */
const MAX_OUTPUT_TOKENS = 2048;
/** Test key's first step only checks that Google answers at all: that is quick or never. */
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_DETAIL_LENGTH = 160;

/**
 * Gemini 3+ Flash/Pro models think before answering ("medium" by default), which is slow for
 * short sparks. "low" is their fastest accepted level ("minimal" is rejected by 3.8 Flash).
 * Older models and Flash-Lite are sent nothing and use their own (fast) default.
 */
export function thinkingLevelFor(model: string): ThinkingLevel | undefined {
  return /^gemini-([3-9]|\d{2,})/.test(model) && !/lite/.test(model) ? 'low' : undefined;
}

/** A tiny real request for Test key: proves key, model and request format all work. */
const TEST_REQUEST: SparkRequest = {
  types: [...SPARK_TYPES],
  vibe: 'light',
  workSafe: true,
  angle: 'food and cooking',
  avoid: [],
  count: 1,
};

export interface GeminiOptions {
  apiKey: string;
  /** Blank means DEFAULT_GEMINI_MODEL. A leading "models/" is ignored. */
  model?: string;
  /** Tried when `model` fails for a reason another model might not have. */
  backupModel?: string | null;
  fetch?: typeof fetch;
  /** Limit for one generation request, per model. */
  timeoutMs?: number;
  /** Limit for Test key's reachability check. */
  connectTimeoutMs?: number;
  /** Clock, for Test key's timings. */
  now?: () => number;
  /** Ids for generated sparks. */
  newId?: () => string;
}

/** Shape of the parts of a generateContent response this app reads. */
interface GenerateContentResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
}

interface ErrorBody {
  error?: { message?: string; status?: string; details?: { reason?: string }[] };
}

export function resolveModel(model: string | undefined): string {
  const trimmed = model?.trim().replace(/^models\//, '') ?? '';
  return trimmed || DEFAULT_GEMINI_MODEL;
}

/** Map an HTTP error to what the app does about it. */
export function errorKindForResponse(status: number, body: unknown): AiErrorKind {
  const error = (body as ErrorBody | null)?.error;
  if (status === 400) {
    const keyRejected =
      error?.details?.some((d) => d.reason === 'API_KEY_INVALID') ||
      /api key/i.test(error?.message ?? '');
    return keyRejected ? 'invalidKey' : 'badResponse';
  }
  if (status === 401 || status === 403) return 'invalidKey';
  if (status === 404) return 'modelNotFound';
  if (status === 429) return 'quota';
  if (status === 408 || status >= 500) return 'network';
  return 'badResponse';
}

/** The provider's error message, one line, short, with the key removed. */
export function safeDetail(message: unknown, apiKey: string): string | undefined {
  if (typeof message !== 'string' || !message.trim()) return undefined;
  let text = message.replace(/\s+/g, ' ').trim();
  if (apiKey) text = text.split(apiKey).join('[key]');
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH - 1)}…` : text;
}

/** Milliseconds as seconds, one decimal below 10 s. */
function seconds(ms: number): string {
  const s = ms / 1000;
  return s < 10 ? String(Math.round(s * 10) / 10) : String(Math.round(s));
}

/** Failures another model may not have: slow or overloaded, out of its quota, missing, or rejecting the request. */
const TRY_BACKUP_ON: readonly AiErrorKind[] = ['network', 'quota', 'modelNotFound', 'badResponse'];

let idCounter = 0;
function defaultNewId(): string {
  idCounter += 1;
  return `ai-${Date.now().toString(36)}-${idCounter}`;
}

/** Gemini via plain fetch to the REST API. The key travels only in the x-goog-api-key header. */
export function createGeminiProvider(options: GeminiOptions): AiProvider {
  const primary = resolveModel(options.model);
  const backup = options.backupModel === undefined ? BACKUP_GEMINI_MODEL : options.backupModel;
  const models = backup && backup !== primary ? [primary, backup] : [primary];
  // Wrapped so the global fetch is always called with the right `this`.
  const fetchFn =
    options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const connectTimeoutMs = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? defaultNewId;
  /** The model that worked last; tried first next time. */
  let preferred = 0;

  async function call(path: string, body?: unknown, limitMs = timeoutMs): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limitMs);
    let response: Response;
    try {
      response = await fetchFn(`${API_BASE}/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'x-goog-api-key': options.apiKey,
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } catch {
      // Offline, DNS, CORS or our timeout: all the same to the user, but say which.
      const detail = controller.signal.aborted
        ? `No answer within ${seconds(limitMs)} s.`
        : 'Could not connect.';
      throw new AiError('network', undefined, detail);
    } finally {
      clearTimeout(timer);
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      if (response.ok) throw new AiError('badResponse', response.status);
    }
    if (!response.ok) {
      const detail = safeDetail((data as ErrorBody | null)?.error?.message, options.apiKey);
      throw new AiError(errorKindForResponse(response.status, data), response.status, detail);
    }
    return data;
  }

  async function generateWith(model: string, request: SparkRequest): Promise<Spark[]> {
    const data = (await call(
      `models/${encodeURIComponent(model)}:generateContent`,
      buildGenerateContentBody(request, {
        thinkingLevel: thinkingLevelFor(model),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      }),
    )) as GenerateContentResponse | null;

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) throw new AiError('blocked', undefined, `Prompt blocked: ${blockReason}.`);
    const candidate = data?.candidates?.[0];
    // Thinking models may return "thought" parts before the answer; only the answer counts.
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
    // No text: blocked by safety filters or simply empty; both are handled the same way.
    if (!text) {
      const reason = candidate?.finishReason;
      throw new AiError(
        'blocked',
        undefined,
        reason ? `Finished with ${reason}.` : 'Empty answer.',
      );
    }

    const sparks = parseSparks(text, request, newId);
    if (sparks.length === 0) {
      throw new AiError('blocked', undefined, 'No usable sparks in the answer.');
    }
    return sparks;
  }

  /** Try the preferred model, then the other one; remember which worked. */
  async function generate(request: SparkRequest): Promise<{ sparks: Spark[]; model: string }> {
    const order = [...models.slice(preferred), ...models.slice(0, preferred)];
    const failures: { model: string; error: AiError }[] = [];
    for (const model of order) {
      try {
        const sparks = await generateWith(model, request);
        preferred = models.indexOf(model);
        return { sparks, model };
      } catch (error) {
        if (!(error instanceof AiError)) throw error;
        failures.push({ model, error });
        if (!TRY_BACKUP_ON.includes(error.kind)) break;
      }
    }
    const first = failures[0];
    if (!first) throw new AiError('badResponse');
    if (failures.length === 1) throw first.error;
    const detail = failures
      .map(({ model, error }) => `${model}: ${error.detail ?? error.message}`)
      .join(' | ');
    throw new AiError(first.error.kind, first.error.status, detail);
  }

  return {
    async generateSparks(request: SparkRequest): Promise<Spark[]> {
      return (await generate(request)).sparks;
    },

    async testKey(): Promise<{ model: string }> {
      // Step 1: can this device reach Google with this key? (A one-entry model list: no
      // generation, no quota, and independent of which model is chosen.)
      const started = now();
      try {
        await call('models?pageSize=1', undefined, connectTimeoutMs);
      } catch (error) {
        if (error instanceof AiError && error.kind === 'network' && error.status === undefined) {
          throw new AiError(
            'network',
            undefined,
            `Could not reach Google: ${error.detail ?? 'no connection.'} Check the internet connection, and any VPN, private DNS or content blocker on this device.`,
          );
        }
        throw error;
      }
      const reachedIn = seconds(now() - started);

      // Step 2: one real spark, since a list read passes even when generation fails.
      try {
        return { model: (await generate(TEST_REQUEST)).model };
      } catch (error) {
        if (error instanceof AiError && error.kind === 'network' && error.status === undefined) {
          throw new AiError(
            'network',
            undefined,
            `Google answered in ${reachedIn} s, but no model wrote a test spark in time (${error.detail ?? 'no answer'}). Try again later.`,
          );
        }
        throw error;
      }
    },
  };
}
