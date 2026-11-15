import { SPARK_TYPES, type SparkRequest } from '../sparks/types';
import { cleanLine, parseSparks } from './parse';
import { AiError } from './provider';

type ParseRequest = Pick<SparkRequest, 'types' | 'vibe' | 'workSafe' | 'avoid'>;

const request: ParseRequest = {
  types: [...SPARK_TYPES],
  vibe: 'deep',
  workSafe: true,
  avoid: [],
};

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

function parse(items: unknown, overrides: Partial<ParseRequest> = {}) {
  return parseSparks(JSON.stringify(items), { ...request, ...overrides }, ids());
}

describe('parseSparks', () => {
  it('turns valid items into AI sparks with the request settings', () => {
    const sparks = parse({
      sparks: [
        { type: 'debate', text: 'Cats or dogs?', options: ['Cats', 'Dogs'] },
        { type: 'hotTake', text: 'Cereal is a soup.' },
      ],
    });
    expect(sparks).toEqual([
      {
        id: 'id1',
        type: 'debate',
        text: 'Cats or dogs?',
        options: ['Cats', 'Dogs'],
        source: 'ai',
        vibe: 'deep',
        workSafe: true,
      },
      {
        id: 'id2',
        type: 'hotTake',
        text: 'Cereal is a soup.',
        source: 'ai',
        vibe: 'deep',
        workSafe: true,
      },
    ]);
  });

  it('accepts a bare array too', () => {
    expect(parse([{ type: 'hotTake', text: 'Mondays are fine.' }])).toHaveLength(1);
  });

  it('cleans numbering, quotes and whitespace', () => {
    const [spark] = parse([{ type: 'hotTake', text: '  1.  "Rain beats  sun." ' }]);
    expect(spark?.text).toBe('Rain beats sun.');
  });

  it('drops items that break the rules', () => {
    const sparks = parse([
      { type: 'hotTake', text: 'x'.repeat(161) },
      { type: 'hotTake', text: 'Party time \u{1F389}' },
      { type: 'debate', text: 'A debate with no sides?' },
      { type: 'debate', text: 'One side only?', options: ['Yes'] },
      { type: 'gossip', text: 'Not a real type.' },
      { type: 'hotTake', text: '' },
      { type: 'hotTake' },
      'just a string',
      null,
    ]);
    expect(sparks).toEqual([]);
  });

  it('drops types that were not requested', () => {
    const sparks = parse(
      [
        { type: 'hotTake', text: 'Not wanted.' },
        { type: 'memoryLane', text: 'Best trip anyone here took?' },
      ],
      { types: ['memoryLane'] },
    );
    expect(sparks.map((s) => s.type)).toEqual(['memoryLane']);
  });

  it('drops options where they do not belong and keeps a plain what-if', () => {
    const sparks = parse([
      { type: 'hotTake', text: 'Pancakes win.', options: ['Agree', 'Disagree'] },
      { type: 'whatIf', text: 'What if you could fly?', options: ['only one'] },
    ]);
    expect(sparks.map((s) => s.options)).toEqual([undefined, undefined]);
  });

  it('drops repeats of the avoid list and of each other, by normalized text', () => {
    const sparks = parse(
      [
        { type: 'hotTake', text: 'cold PIZZA wins' },
        { type: 'hotTake', text: 'Board games win.' },
        { type: 'hotTake', text: 'board games win' },
      ],
      { avoid: ['Cold pizza wins.'] },
    );
    expect(sparks.map((s) => s.text)).toEqual(['Board games win.']);
  });

  it('throws badResponse for invalid JSON', () => {
    expect(() => parseSparks('{"sparks": [', request, ids())).toThrow(new AiError('badResponse'));
  });
});

describe('cleanLine', () => {
  it('strips list markers and curly quotes', () => {
    expect(cleanLine('- “Hello there”')).toBe('Hello there');
    expect(cleanLine('2) What if?')).toBe('What if?');
  });
});
