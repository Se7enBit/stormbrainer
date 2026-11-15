import { ANGLES } from '../ai/angles';
import { AiError, type AiErrorKind, type AiProvider } from '../ai/provider';
import { deck } from './deck';
import { defaultFilters } from './filters';
import { emptyHistory, type History } from './history';
import {
  BATCH_SIZE,
  ERROR_COOLDOWN_MS,
  QUOTA_COOLDOWN_MS,
  SparkSource,
  settingsKey,
  type SourceSettings,
} from './source';
import type { Spark, SparkRequest } from './types';

type Reply = Spark[] | AiErrorKind | Error | Promise<Spark[]>;

let batch = 0;
beforeEach(() => {
  batch = 0;
});

function aiBatch(request: SparkRequest, size = BATCH_SIZE): Spark[] {
  batch += 1;
  return Array.from({ length: size }, (_, i) => ({
    id: `ai-${batch}-${i}`,
    type: request.types[0] ?? 'hotTake',
    text: `AI spark ${batch}.${i}`,
    source: 'ai',
    vibe: request.vibe,
    workSafe: request.workSafe,
  }));
}

/** A provider that answers from a script; an empty script means "a fresh batch". */
function fakeProvider(script: Reply[] = []) {
  const requests: SparkRequest[] = [];
  const provider: AiProvider = {
    generateSparks: jest.fn(async (request: SparkRequest) => {
      requests.push(request);
      const reply = script.shift();
      if (reply === undefined) return aiBatch(request);
      if (typeof reply === 'string') throw new AiError(reply);
      if (reply instanceof Error) throw reply;
      return reply;
    }),
    testKey: jest.fn(async () => {}),
  };
  return { provider, requests };
}

function setup(script?: Reply[], aiWaitMs = 1_000) {
  let now = 1_000_000;
  const source = new SparkSource({ deck, now: () => now, aiWaitMs });
  const fake = fakeProvider(script);
  source.setProvider(fake.provider);
  let history: History = emptyHistory;
  let current: Spark | null = null;
  const settings: SourceSettings = { filters: defaultFilters };
  const waits = jest.fn();

  async function tap(overrides: Partial<SourceSettings> = {}) {
    const result = await source.next({ ...settings, ...overrides }, history, current, waits);
    if (!result) throw new Error('no spark');
    history = result.history;
    current = result.spark;
    // Let any background refill settle, as time passes between taps.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return result;
  }

  return {
    source,
    tap,
    waits,
    ...fake,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('SparkSource without a key', () => {
  it('draws from the deck and never waits', async () => {
    const source = new SparkSource({ deck });
    const waits = jest.fn();
    const result = await source.next({ filters: defaultFilters }, emptyHistory, null, waits);
    expect(result?.spark.source).toBe('deck');
    expect(result?.aiProblem?.kind).toBeUndefined();
    expect(waits).not.toHaveBeenCalled();
  });
});

describe('SparkSource with a key', () => {
  it('asks for one batch of 5 with the settings, angle and recent texts', async () => {
    const { tap, requests, waits } = setup();
    const first = await tap({ context: '  old uni   friends ' });
    expect(first.spark.source).toBe('ai');
    expect(waits).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      types: defaultFilters.types,
      vibe: 'light',
      workSafe: false,
      context: 'old uni friends',
      count: 5,
      avoid: [],
    });
    expect(ANGLES).toContain(requests[0]?.angle);
  });

  it('prefetch fills the queue so the first tap is an AI card without waiting', async () => {
    const { source, tap, requests, waits } = setup();
    source.prefetch({ filters: defaultFilters }, emptyHistory);
    source.prefetch({ filters: defaultFilters }, emptyHistory);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toHaveLength(1);
    const first = await tap();
    expect(first.spark.source).toBe('ai');
    expect(waits).not.toHaveBeenCalled();
  });

  it('carries the provider detail with a fallback', async () => {
    const { tap } = setup([new AiError('quota', 429, 'Quota exceeded.')]);
    expect((await tap()).aiProblem).toEqual({ kind: 'quota', detail: 'Quota exceeded.' });
  });

  it('serves taps from the queue and refills in the background when one is left', async () => {
    const { tap, requests, waits } = setup();
    const shown: Spark[] = [];
    for (let i = 0; i < 4; i++) shown.push((await tap()).spark);
    // Tap 1 fetched; taps 2-3 came from the queue; tap 4 left one, so a refill started.
    expect(requests).toHaveLength(2);
    expect(waits).toHaveBeenCalledTimes(1);
    // The refill avoids what was shown and what is still queued.
    expect(requests[1]?.avoid).toEqual(
      expect.arrayContaining([...shown.map((s) => s.text), 'AI spark 1.4']),
    );
    for (let i = 0; i < 6; i++) shown.push((await tap()).spark);
    expect(shown.every((s) => s.source === 'ai')).toBe(true);
    expect(new Set(shown.map((s) => s.id)).size).toBe(10);
    expect(waits).toHaveBeenCalledTimes(1);
  });

  it('drops the queue when the chips or context change', async () => {
    const { tap, requests } = setup();
    await tap();
    const spicy = await tap({ filters: { ...defaultFilters, vibe: 'spicy' } });
    expect(spicy.spark.vibe).toBe('spicy');
    expect(requests.map((r) => r.vibe)).toEqual(['light', 'spicy']);
    await tap({ filters: { ...defaultFilters, vibe: 'spicy' }, context: 'team lunch' });
    expect(requests).toHaveLength(3);
    expect(requests[2]?.context).toBe('team lunch');
  });

  it('retries a blocked answer once with a different angle', async () => {
    const { tap, requests } = setup(['blocked']);
    const result = await tap();
    expect(result.spark.source).toBe('ai');
    expect(requests).toHaveLength(2);
    expect(requests[1]?.angle).not.toBe(requests[0]?.angle);
  });

  it.each<[AiErrorKind[], AiErrorKind, number]>([
    [['blocked', 'blocked'], 'blocked', ERROR_COOLDOWN_MS],
    [['network'], 'network', ERROR_COOLDOWN_MS],
    [['badResponse'], 'badResponse', ERROR_COOLDOWN_MS],
    [['quota'], 'quota', QUOTA_COOLDOWN_MS],
  ])(
    'falls back to the deck on %j, pauses AI, then tries again',
    async (script, kind, cooldown) => {
      const { tap, requests, advance } = setup([...script]);
      const fallback = await tap();
      expect(fallback.spark.source).toBe('deck');
      expect(fallback.aiProblem?.kind).toBe(kind);
      const calls = requests.length;

      advance(cooldown - 1);
      expect((await tap()).spark.source).toBe('deck');
      expect(requests).toHaveLength(calls);

      advance(1);
      const back = await tap();
      expect(back.spark.source).toBe('ai');
      expect(back.aiProblem?.kind).toBeUndefined();
    },
  );

  it.each<AiErrorKind>(['invalidKey', 'modelNotFound'])(
    'stops calling AI after %s until the key or model changes',
    async (kind) => {
      const { source, tap, requests, advance } = setup([kind]);
      expect((await tap()).aiProblem?.kind).toBe(kind);
      advance(QUOTA_COOLDOWN_MS * 10);
      expect((await tap()).spark.source).toBe('deck');
      expect(requests).toHaveLength(1);

      source.setProvider(fakeProvider().provider);
      expect((await tap()).spark.source).toBe('ai');
    },
  );

  it('treats an unexpected error as a bad response instead of crashing', async () => {
    const { tap } = setup([new TypeError('boom')]);
    expect((await tap()).aiProblem?.kind).toBe('badResponse');
  });

  it('shows a deck card when AI is slow, and the AI card on a later tap', async () => {
    let resolve: (sparks: Spark[]) => void = () => {};
    const slow = new Promise<Spark[]>((r) => {
      resolve = r;
    });
    const { tap, requests } = setup([slow], 20);
    const first = await tap();
    expect(first.spark.source).toBe('deck');
    expect(first.aiProblem?.kind).toBeUndefined();

    resolve(aiBatch(requests[0]!));
    await new Promise((r) => setTimeout(r, 0));
    expect((await tap()).spark.source).toBe('ai');
    expect(requests).toHaveLength(1);
  });

  it('ignores a batch that arrives after the key changed', async () => {
    let resolve: (sparks: Spark[]) => void = () => {};
    const slow = new Promise<Spark[]>((r) => {
      resolve = r;
    });
    const { source, tap, requests } = setup([slow], 20);
    await tap();
    source.setProvider(null);
    resolve(aiBatch(requests[0]!));
    await new Promise((r) => setTimeout(r, 0));
    const result = await tap();
    expect(result.spark.source).toBe('deck');
    expect(result.aiProblem?.kind).toBeUndefined();
  });

  it('skips queued sparks that were already shown', async () => {
    const repeat: Spark = {
      id: 'ai-x',
      type: 'hotTake',
      text: 'Soup is a meal.',
      source: 'ai',
      vibe: 'light',
      workSafe: false,
    };
    const { tap } = setup([
      [repeat, { ...repeat, id: 'ai-y' }, { ...repeat, id: 'ai-z', text: 'Toast is cake.' }],
    ]);
    expect((await tap()).spark.text).toBe('Soup is a meal.');
    expect((await tap()).spark.text).toBe('Toast is cake.');
  });
});

describe('settingsKey', () => {
  it('ignores type order and context whitespace', () => {
    const a = settingsKey({
      filters: { ...defaultFilters, types: ['debate', 'whatIf'] },
      context: 'cabin ',
    });
    const b = settingsKey({
      filters: { ...defaultFilters, types: ['whatIf', 'debate'] },
      context: ' cabin',
    });
    expect(a).toBe(b);
    expect(settingsKey({ filters: defaultFilters })).not.toBe(
      settingsKey({ filters: { ...defaultFilters, workSafe: true } }),
    );
  });
});
