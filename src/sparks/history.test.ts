import {
  RECENT_TEXTS_LIMIT,
  emptyHistory,
  forget,
  hasSeen,
  hashText,
  normalizeText,
  recordShown,
} from './history';
import type { Spark } from './types';

function spark(id: string, text: string): Spark {
  return { id, type: 'hotTake', text, source: 'deck', vibe: 'light', workSafe: true };
}

describe('normalizeText', () => {
  it('ignores case, punctuation and extra whitespace', () => {
    expect(normalizeText('  Is a HOT dog,  a sandwich?! ')).toBe('is a hot dog a sandwich');
  });

  it('keeps letters from other scripts', () => {
    expect(normalizeText('Καλή ΜΕΡΑ!')).toBe('καλή μερα');
  });
});

describe('hashText', () => {
  it('is stable and equal for texts that normalize the same', () => {
    expect(hashText('Cereal is a soup.')).toBe(hashText('cereal is a SOUP'));
    expect(hashText('Cereal is a soup.')).toMatch(/^[0-9a-f]{8}$/);
    expect(hashText('Cereal is a soup.')).not.toBe(hashText('Cereal is a salad.'));
  });
});

describe('history', () => {
  it('has seen a spark by id or by normalized text', () => {
    const history = recordShown(emptyHistory, spark('a', 'Cold pizza wins.'));
    expect(hasSeen(history, spark('a', 'Different text'))).toBe(true);
    expect(hasSeen(history, spark('z', 'cold PIZZA wins'))).toBe(true);
    expect(hasSeen(history, spark('z', 'Hot pizza wins'))).toBe(false);
  });

  it('does not mutate the previous history', () => {
    const before = emptyHistory;
    recordShown(before, spark('a', 'Text'));
    expect(before).toEqual({ seenIds: [], seenHashes: [], recentTexts: [] });
  });

  it('keeps the most recent texts first, capped', () => {
    let history = emptyHistory;
    for (let i = 0; i < RECENT_TEXTS_LIMIT + 5; i++) {
      history = recordShown(history, spark(`s${i}`, `Spark number ${i}`));
    }
    expect(history.recentTexts).toHaveLength(RECENT_TEXTS_LIMIT);
    expect(history.recentTexts[0]).toBe(`Spark number ${RECENT_TEXTS_LIMIT + 4}`);
  });

  it('forget starts a new cycle for those sparks but keeps recent texts', () => {
    const a = spark('a', 'First');
    const b = spark('b', 'Second');
    const history = recordShown(recordShown(emptyHistory, a), b);
    const next = forget(history, [a]);
    expect(hasSeen(next, a)).toBe(false);
    expect(hasSeen(next, b)).toBe(true);
    expect(next.recentTexts).toEqual(['Second', 'First']);
  });
});
