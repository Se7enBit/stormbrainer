import rawDeck from './deck.json';
import { deck, deckPool, drawFromDeck, matchesFilters } from './deck';
import { defaultFilters } from './filters';
import { emptyHistory, normalizeText, type History } from './history';
import { SPARK_TYPES, VIBES, type Spark, type SparkFilters } from './types';
import { sparkProblems } from './validate';

/** Deterministic random numbers for repeatable draws. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function spark(overrides: Partial<Spark>): Spark {
  return {
    id: 'x',
    type: 'debate',
    text: 'A spark',
    options: ['One', 'Two'],
    source: 'deck',
    vibe: 'light',
    workSafe: true,
    ...overrides,
  };
}

describe('deck.json', () => {
  it('has the ~150 sparks the MVP calls for', () => {
    expect(rawDeck.length).toBeGreaterThanOrEqual(150);
  });

  it.each(rawDeck.map((entry) => [entry.id, entry]))('entry %s is valid', (_id, entry) => {
    expect(sparkProblems(entry)).toEqual([]);
  });

  it('has unique ids and unique texts', () => {
    const ids = rawDeck.map((e) => e.id);
    const texts = rawDeck.map((e) => normalizeText(e.text));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('has a work-safe spark for every type and vibe, so work-safe never runs dry', () => {
    for (const type of SPARK_TYPES) {
      for (const vibe of VIBES) {
        const found = deck.some((s) => s.type === type && s.vibe === vibe && s.workSafe);
        expect({ type, vibe, found }).toEqual({ type, vibe, found: true });
      }
    }
  });

  it('has Brainstorm creativity prompts for every vibe, work-safe included', () => {
    for (const vibe of VIBES) {
      expect(deck.some((s) => s.type === 'idea' && s.vibe === vibe && s.workSafe)).toBe(true);
    }
    expect(deck.filter((s) => s.type === 'idea').length).toBeGreaterThanOrEqual(40);
  });

  it('marks every deck spark as coming from the deck', () => {
    expect(deck.every((s) => s.source === 'deck')).toBe(true);
  });
});

describe('sparkProblems', () => {
  it('reports shape and content problems', () => {
    expect(sparkProblems(null)).toEqual(['not an object']);
    expect(
      sparkProblems({ id: 'a', type: 'debate', vibe: 'light', workSafe: true, text: 'Q?' }),
    ).toEqual(['missing options']);
    expect(
      sparkProblems({
        id: 'a',
        type: 'hotTake',
        vibe: 'mild',
        workSafe: true,
        text: '1. Cats rule \u{1F431}',
        options: ['a', 'b'],
      }),
    ).toEqual([
      'bad vibe mild',
      'emoji in text',
      'numbered text',
      'options not allowed for hotTake',
    ]);
    expect(
      sparkProblems({
        id: 'a',
        type: 'whatIf',
        vibe: 'deep',
        workSafe: false,
        text: 'x'.repeat(161),
        options: ['only one'],
      }),
    ).toEqual(['text over 160 chars', 'options must be two non-empty strings']);
  });
});

describe('filtering', () => {
  const sparks = [
    spark({ id: 'a', type: 'debate', vibe: 'light', workSafe: true }),
    spark({ id: 'b', type: 'hotTake', vibe: 'light', workSafe: false, options: undefined }),
    spark({ id: 'c', type: 'hotTake', vibe: 'deep', workSafe: true, options: undefined }),
  ];

  it('matches type, vibe and work-safe', () => {
    const filters: SparkFilters = { types: ['hotTake'], vibe: 'light', workSafe: false };
    expect(sparks.filter((s) => matchesFilters(s, filters)).map((s) => s.id)).toEqual(['b']);
  });

  it('work-safe excludes sparks not tagged work-safe', () => {
    const filters: SparkFilters = { types: ['hotTake'], vibe: 'light', workSafe: true };
    // The strict pool is empty, so the vibe is relaxed, but work-safe still holds.
    expect(deckPool(sparks, filters).map((s) => s.id)).toEqual(['c']);
  });

  it('relaxes only the vibe when nothing matches', () => {
    const filters: SparkFilters = { types: ['debate'], vibe: 'spicy', workSafe: false };
    expect(deckPool(sparks, filters).map((s) => s.id)).toEqual(['a']);
  });

  it('never yields a non-work-safe deck spark with work-safe on, for any settings', () => {
    for (const vibe of VIBES) {
      for (const type of SPARK_TYPES) {
        const pool = deckPool(deck, { types: [type], vibe, workSafe: true });
        expect(pool.length).toBeGreaterThan(0);
        expect(pool.every((s) => s.workSafe && s.type === type)).toBe(true);
      }
    }
  });
});

describe('drawFromDeck', () => {
  function drawMany(filters: SparkFilters, count: number, random = seededRandom(1)) {
    let history: History = emptyHistory;
    let current: Spark | null = null;
    const shown: Spark[] = [];
    for (let i = 0; i < count; i++) {
      const result = drawFromDeck(deck, filters, history, random, current);
      if (!result) throw new Error('empty pool');
      history = result.history;
      current = result.spark;
      shown.push(result.spark);
    }
    return shown;
  }

  it('shows every spark in the pool once before any repeat', () => {
    const allLight: SparkFilters = { ...defaultFilters, vibe: 'light' };
    const poolSize = deckPool(deck, allLight).length;
    const shown = drawMany(allLight, poolSize);
    expect(new Set(shown.map((s) => s.id)).size).toBe(poolSize);
  });

  // SPEC §7: fresh install, no key, 50 taps produce no repeats.
  it.each([false, true])(
    'gives 50 taps without a repeat at default settings (work-safe %s)',
    (workSafe) => {
      for (let seed = 1; seed <= 10; seed++) {
        const shown = drawMany({ ...defaultFilters, workSafe }, 50, seededRandom(seed));
        expect(new Set(shown.map((s) => s.id)).size).toBe(50);
        expect(new Set(shown.map((s) => normalizeText(s.text))).size).toBe(50);
      }
    },
  );

  it('only draws sparks matching the filters', () => {
    const filters: SparkFilters = { types: ['memoryLane'], vibe: 'deep', workSafe: true };
    const shown = drawMany(filters, 10);
    expect(shown.every((s) => matchesFilters(s, filters))).toBe(true);
  });

  it('starts a new cycle when the pool runs out, without repeating the last card', () => {
    const filters: SparkFilters = { types: ['debate'], vibe: 'spicy', workSafe: false };
    const poolSize = deckPool(deck, filters).length;
    for (let seed = 1; seed <= 20; seed++) {
      const shown = drawMany(filters, poolSize * 3, seededRandom(seed));
      for (let i = 1; i < shown.length; i++) {
        expect(shown[i]?.id).not.toBe(shown[i - 1]?.id);
      }
      // Each cycle still covers the whole pool once.
      expect(new Set(shown.slice(poolSize, poolSize * 2).map((s) => s.id)).size).toBe(poolSize);
    }
  });

  it('dedupes by normalized text as well as by id', () => {
    const a = spark({ id: 'a', text: 'Is a hot dog a sandwich?' });
    const b = spark({ id: 'b', text: 'is a HOT DOG a sandwich' });
    const c = spark({ id: 'c', text: 'Something else entirely' });
    const first = drawFromDeck([a, b, c], defaultFilters, emptyHistory, () => 0);
    expect(first?.spark.id).toBe('a');
    const second = drawFromDeck([a, b, c], defaultFilters, first!.history, () => 0);
    expect(second?.spark.id).toBe('c');
  });

  it('returns null when nothing can match', () => {
    const onlyUnsafe = [spark({ workSafe: false })];
    expect(drawFromDeck(onlyUnsafe, { ...defaultFilters, workSafe: true }, emptyHistory)).toBe(
      null,
    );
  });
});
