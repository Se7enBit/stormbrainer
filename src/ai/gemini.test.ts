import type { SparkRequest } from '../sparks/types';
import { strings } from '../strings';
import {
  DEFAULT_GEMINI_MODEL,
  createGeminiProvider,
  errorKindForResponse,
  resolveModel,
  safeDetail,
  thinkingLevelFor,
} from './gemini';
import { buildGenerateContentBody } from './prompt';
import { AI_ERROR_KINDS, AiError, type AiErrorKind } from './provider';

// Tests never hit the real API: fetch is always a mock.

const KEY = 'test-key-AIza-not-real';

const request: SparkRequest = {
  types: ['hotTake', 'debate'],
  vibe: 'light',
  workSafe: false,
  angle: 'food and cooking',
  avoid: [],
  count: 5,
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function answer(sparks: unknown, extraParts: object[] = []) {
  return jsonResponse(200, {
    candidates: [
      {
        content: { parts: [...extraParts, { text: JSON.stringify({ sparks }) }] },
        finishReason: 'STOP',
      },
    ],
  });
}

function setup(response: Response | (() => Promise<Response>), model?: string) {
  const fetch = jest.fn(typeof response === 'function' ? response : async () => response);
  let n = 0;
  const provider = createGeminiProvider({
    apiKey: KEY,
    model,
    fetch: fetch as unknown as typeof globalThis.fetch,
    newId: () => `ai${++n}`,
  });
  return { provider, fetch };
}

async function errorOf(promise: Promise<unknown>): Promise<AiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AiError) return error;
    throw error;
  }
  throw new Error('expected an AiError');
}

describe('generateSparks', () => {
  it('posts the prompt to generateContent with the key only in the header', async () => {
    const { provider, fetch } = setup(answer([{ type: 'hotTake', text: 'Soup is a meal.' }]));
    await provider.generateSparks(request);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    );
    expect(url).not.toContain(KEY);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'x-goog-api-key': KEY, 'content-type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(
      buildGenerateContentBody(request, { thinkingLevel: 'low' }),
    );
    // Gemini 3.x thinks at "medium" by default; low keeps the first card fast.
    expect(JSON.parse(init.body as string).generationConfig.thinkingConfig).toEqual({
      thinkingLevel: 'low',
    });
  });

  it('returns parsed AI sparks and ignores thought parts', async () => {
    const { provider } = setup(
      answer(
        [
          { type: 'hotTake', text: 'Soup is a meal.' },
          { type: 'debate', text: 'Tea or coffee?', options: ['Tea', 'Coffee'] },
        ],
        [{ text: 'thinking about soup...', thought: true }],
      ),
    );
    await expect(provider.generateSparks(request)).resolves.toEqual([
      {
        id: 'ai1',
        type: 'hotTake',
        text: 'Soup is a meal.',
        source: 'ai',
        vibe: 'light',
        workSafe: false,
      },
      {
        id: 'ai2',
        type: 'debate',
        text: 'Tea or coffee?',
        options: ['Tea', 'Coffee'],
        source: 'ai',
        vibe: 'light',
        workSafe: false,
      },
    ]);
  });

  it.each<[string, Response, AiErrorKind]>([
    [
      'a rejected key (400)',
      jsonResponse(400, {
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'API key not valid. Please pass a valid API key.',
          details: [{ reason: 'API_KEY_INVALID' }],
        },
      }),
      'invalidKey',
    ],
    [
      'a forbidden key (403)',
      jsonResponse(403, { error: { status: 'PERMISSION_DENIED' } }),
      'invalidKey',
    ],
    [
      'an unknown model (404)',
      jsonResponse(404, { error: { status: 'NOT_FOUND' } }),
      'modelNotFound',
    ],
    ['quota (429)', jsonResponse(429, { error: { status: 'RESOURCE_EXHAUSTED' } }), 'quota'],
    [
      'an overloaded server (503)',
      jsonResponse(503, { error: { status: 'UNAVAILABLE' } }),
      'network',
    ],
    [
      'a bad request (400)',
      jsonResponse(400, { error: { message: 'Invalid schema' } }),
      'badResponse',
    ],
    [
      'a blocked prompt',
      jsonResponse(200, { promptFeedback: { blockReason: 'SAFETY' } }),
      'blocked',
    ],
    [
      'a safety-blocked answer',
      jsonResponse(200, { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }),
      'blocked',
    ],
    ['no candidates', jsonResponse(200, { candidates: [] }), 'blocked'],
    ['an answer with no valid sparks', answer([{ type: 'hotTake', text: '' }]), 'blocked'],
    [
      'invalid JSON text',
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"sparks": [' }] } }] }),
      'badResponse',
    ],
    [
      'a non-JSON body',
      {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      } as unknown as Response,
      'badResponse',
    ],
  ])('maps %s to %s', async (_label, response, kind) => {
    const { provider } = setup(response);
    expect((await errorOf(provider.generateSparks(request))).kind).toBe(kind);
  });

  it('maps a failed fetch to network', async () => {
    const { provider } = setup(async () => {
      throw new TypeError('Network request failed');
    });
    expect((await errorOf(provider.generateSparks(request))).kind).toBe('network');
  });

  it('times out to network instead of spinning forever', async () => {
    const fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const provider = createGeminiProvider({
      apiKey: KEY,
      fetch: fetch as unknown as typeof globalThis.fetch,
      timeoutMs: 10,
    });
    const error = await errorOf(provider.generateSparks(request));
    expect(error.kind).toBe('network');
    expect(error.detail).toBe('No answer within 0 s.');
  });

  it('never puts the key in an error', async () => {
    const { provider } = setup(
      jsonResponse(400, { error: { message: `API key not valid: ${KEY}` } }),
    );
    const error = await errorOf(provider.generateSparks(request));
    expect(error.kind).toBe('invalidKey');
    expect(String(error)).not.toContain(KEY);
    expect(JSON.stringify(error)).not.toContain(KEY);
    expect(error.stack ?? '').not.toContain(KEY);
    expect(error.detail).toBe('API key not valid: [key]');
  });
});

describe('testKey', () => {
  it('asks Gemini for one real spark, so it proves generation works', async () => {
    const { provider, fetch } = setup(answer([{ type: 'hotTake', text: 'Toast is underrated.' }]));
    await expect(provider.testKey()).resolves.toBeUndefined();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'x-goog-api-key': KEY, 'content-type': 'application/json' });
    expect(String(init.body)).toContain('Write 1 spark.');
  });

  it('fails when the answer has no usable spark', async () => {
    const { provider } = setup(answer([]));
    const error = await errorOf(provider.testKey());
    expect(error.kind).toBe('blocked');
    expect(error.detail).toBe('No usable sparks in the answer.');
  });

  it("reports a rejected key with Google's own message", async () => {
    const { provider } = setup(
      jsonResponse(400, {
        error: {
          message: 'API key not valid. Please pass a valid API key.',
          details: [{ reason: 'API_KEY_INVALID' }],
        },
      }),
    );
    const error = await errorOf(provider.testKey());
    expect(error.kind).toBe('invalidKey');
    expect(error.detail).toBe('API key not valid. Please pass a valid API key.');
  });

  it('uses the model override from Settings, without thinkingLevel for older models', async () => {
    const { provider, fetch } = setup(
      answer([{ type: 'hotTake', text: 'Toast is underrated.' }]),
      'models/gemini-2.5-flash',
    );
    await provider.testKey();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect(JSON.parse(String(init.body)).generationConfig.thinkingConfig).toBeUndefined();
  });
});

describe('thinkingLevelFor', () => {
  it('asks Gemini 3 and later for low thinking only', () => {
    expect(thinkingLevelFor('gemini-3.8-flash')).toBe('low');
    expect(thinkingLevelFor('gemini-4-argon')).toBe('low');
    expect(thinkingLevelFor('gemini-12-pro')).toBe('low');
    expect(thinkingLevelFor('gemini-2.5-flash')).toBeUndefined();
    expect(thinkingLevelFor('custom-model')).toBeUndefined();
  });
});

describe('safeDetail', () => {
  it('keeps one short line and never the key', () => {
    expect(safeDetail(`Bad\n key ${KEY} here`, KEY)).toBe('Bad key [key] here');
    expect(safeDetail('x'.repeat(300), KEY)).toHaveLength(160);
    expect(safeDetail(undefined, KEY)).toBeUndefined();
    expect(safeDetail('  ', KEY)).toBeUndefined();
  });
});

describe('resolveModel', () => {
  it('falls back to the default for blank input', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel('  ')).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveModel(' models/gemini-x ')).toBe('gemini-x');
  });
});

describe('errorKindForResponse', () => {
  it('maps statuses without a body', () => {
    expect(errorKindForResponse(401, null)).toBe('invalidKey');
    expect(errorKindForResponse(408, null)).toBe('network');
    expect(errorKindForResponse(500, undefined)).toBe('network');
    expect(errorKindForResponse(418, {})).toBe('badResponse');
  });

  it('has a friendly message for every error kind', () => {
    for (const kind of AI_ERROR_KINDS) expect(strings.aiErrors[kind]).toMatch(/\w/);
  });
});
