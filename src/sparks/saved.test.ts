import {
  MAX_SAVED,
  addSaved,
  isSaved,
  mergeSaved,
  parseSaved,
  removeSaved,
  toggleSaved,
} from './saved';
import type { Spark } from './types';

function spark(id: string, text = `Spark ${id}?`): Spark {
  return { id, type: 'memoryLane', text, source: 'deck', vibe: 'light', workSafe: true };
}

describe('saved list', () => {
  it('adds newest first and never twice (by id or by text)', () => {
    let saved = addSaved([], spark('a'));
    saved = addSaved(saved, spark('b'));
    saved = addSaved(saved, spark('a'));
    saved = addSaved(saved, spark('c', 'spark A'));
    expect(saved.map((s) => s.id)).toEqual(['b', 'a']);
    expect(isSaved(saved, spark('zzz', 'SPARK b?'))).toBe(true);
  });

  it('toggles and removes', () => {
    const saved = toggleSaved([spark('a'), spark('b')], spark('a'));
    expect(saved.map((s) => s.id)).toEqual(['b']);
    expect(toggleSaved(saved, spark('a')).map((s) => s.id)).toEqual(['a', 'b']);
    expect(removeSaved(saved, spark('b'))).toEqual([]);
  });

  it('is capped', () => {
    let saved: Spark[] = [];
    for (let i = 0; i < MAX_SAVED + 10; i++) saved = addSaved(saved, spark(`s${i}`));
    expect(saved).toHaveLength(MAX_SAVED);
    expect(saved[0]?.id).toBe(`s${MAX_SAVED + 9}`);
  });

  it('merges without duplicates, keeping the first list on top', () => {
    const merged = mergeSaved([spark('new')], [spark('old'), spark('new'), spark('older')]);
    expect(merged.map((s) => s.id)).toEqual(['new', 'old', 'older']);
  });
});

describe('parseSaved', () => {
  it('round-trips valid sparks', () => {
    const list = [spark('a'), { ...spark('b'), source: 'ai' as const }];
    expect(parseSaved(JSON.stringify(list))).toEqual(list);
  });

  it('drops anything unreadable instead of throwing', () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved('not json')).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
    expect(
      parseSaved(
        JSON.stringify([
          spark('ok'),
          { ...spark('x'), source: 'elsewhere' },
          { ...spark('y'), text: '' },
          { ...spark('z'), type: 'debate' },
          null,
        ]),
      ).map((s) => s.id),
    ).toEqual(['ok']);
  });
});
