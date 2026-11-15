import type { Spark, SparkRequest } from '../sparks/types';
import { parseSparks } from './parse';
import { buildGenerateContentBody } from './prompt';
import { AiError, type AiErrorKind, type AiProvider } from './provider';

/**
 * The default model: the one place a model name lives (Settings → Advanced can override it).
 * Free-tier models change: when touching this, confirm in Google AI Studio that it is still
 * on the free tier. Last checked 2026-11-15.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface GeminiOptions {
  apiKey: string;
  /** Blank means DEFAULT_GEMINI_MODEL. A leading "models/" is ignored. */
  model?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Ids for generated sparks. */
  newId?: () => string;
}

/** Shape of the parts of a generateContent response this app reads. */
interface GenerateContentResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: {
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

let idCounter = 0;
function defaultNewId(): string {
  idCounter += 1;
  return `ai-${Date.now().toString(36)}-${idCounter}`;
}

/** Gemini via plain fetch to the REST API. The key travels only in the x-goog-api-key header. */
export function createGeminiProvider(options: GeminiOptions): AiProvider {
  const model = resolveModel(options.model);
  const fetchFn = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const newId = options.newId ?? defaultNewId;
  const modelPath = `models/${encodeURIComponent(model)}`;

  async function call(path: string, body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      // Offline, DNS, CORS or our timeout: all the same to the user.
      throw new AiError('network');
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
      throw new AiError(errorKindForResponse(response.status, data), response.status);
    }
    return data;
  }

  return {
    async generateSparks(request: SparkRequest): Promise<Spark[]> {
      const data = (await call(
        `${modelPath}:generateContent`,
        buildGenerateContentBody(request),
      )) as GenerateContentResponse | null;

      if (data?.promptFeedback?.blockReason) throw new AiError('blocked');
      const candidate = data?.candidates?.[0];
      // Thinking models may return "thought" parts before the answer; only the answer counts.
      const text = (candidate?.content?.parts ?? [])
        .filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
      // No text: blocked by safety filters or simply empty; both are handled the same way.
      if (!text) throw new AiError('blocked');

      const sparks = parseSparks(text, request, newId);
      if (sparks.length === 0) throw new AiError('blocked');
      return sparks;
    },

    async testKey(): Promise<void> {
      // Reading the model's metadata is the smallest request that proves key and model work,
      // and it costs no generation quota.
      await call(modelPath);
    },
  };
}
