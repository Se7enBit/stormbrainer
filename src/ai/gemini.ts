import { SPARK_TYPES, type Spark, type SparkRequest } from '../sparks/types';
import { parseSparks } from './parse';
import { buildGenerateContentBody, type ThinkingLevel } from './prompt';
import { AiError, type AiErrorKind, type AiProvider } from './provider';

/**
 * The default model: the one place a model name lives (Settings → Advanced can override it).
 * Free-tier models change: when touching this, confirm in Google AI Studio that it is still
 * on the free tier. Last checked 2026-11-15.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
/** Where users create a key (linked from Settings). */
export const API_KEY_URL = 'https://aistudio.google.com/apikey';
/** Generous: a busy model can take a while for a batch. Taps never wait this long. */
const DEFAULT_TIMEOUT_MS = 60_000;
/** Test key's first step only checks that Google answers at all: that is quick or never. */
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_DETAIL_LENGTH = 160;

/**
 * Gemini 3+ models think before answering ("medium" by default), which is slow for short
 * sparks. "low" is their fastest accepted level ("minimal" is rejected by 3.8 Flash).
 * Older models do not take thinkingLevel, so it is only sent to 3+.
 */
export function thinkingLevelFor(model: string): ThinkingLevel | undefined {
  return /^gemini-([3-9]|\d{2,})/.test(model) ? 'low' : undefined;
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
  fetch?: typeof fetch;
  /** Limit for generation requests. */
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

let idCounter = 0;
function defaultNewId(): string {
  idCounter += 1;
  return `ai-${Date.now().toString(36)}-${idCounter}`;
}

/** Gemini via plain fetch to the REST API. The key travels only in the x-goog-api-key header. */
export function createGeminiProvider(options: GeminiOptions): AiProvider {
  const model = resolveModel(options.model);
  // Wrapped so the global fetch is always called with the right `this`.
  const fetchFn =
    options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const connectTimeoutMs = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? defaultNewId;
  const modelPath = `models/${encodeURIComponent(model)}`;
  const thinkingLevel = thinkingLevelFor(model);

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

  async function generateSparks(request: SparkRequest): Promise<Spark[]> {
    const data = (await call(
      `${modelPath}:generateContent`,
      buildGenerateContentBody(request, { thinkingLevel }),
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
    if (sparks.length === 0)
      throw new AiError('blocked', undefined, 'No usable sparks in the answer.');
    return sparks;
  }

  return {
    generateSparks,
    async testKey(): Promise<void> {
      // Step 1: can this device reach Google at all? (Model metadata: no generation, no quota.)
      const started = now();
      try {
        await call(modelPath, undefined, connectTimeoutMs);
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

      // Step 2: one real spark, since a metadata read passes even when generation fails.
      try {
        await generateSparks(TEST_REQUEST);
      } catch (error) {
        if (error instanceof AiError && error.kind === 'network' && error.status === undefined) {
          throw new AiError(
            'network',
            undefined,
            `Google answered in ${reachedIn} s, but Gemini did not write a test spark (${error.detail ?? 'no answer'}). The model may be busy: try again later, or try another model under Advanced.`,
          );
        }
        throw error;
      }
    },
  };
}
