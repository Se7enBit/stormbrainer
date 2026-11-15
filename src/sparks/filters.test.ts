import { allTypesSelected, defaultFilters, filtersForMode, toggleType } from './filters';
import { MODE_TYPES } from './types';

const SPARK_TYPES = MODE_TYPES.sparks;

describe('defaultFilters', () => {
  it('selects all types, light vibe, work-safe off', () => {
    expect(allTypesSelected(defaultFilters.types)).toBe(true);
    expect(defaultFilters.vibe).toBe('light');
    expect(defaultFilters.workSafe).toBe(false);
  });
});

describe('toggleType', () => {
  it('focuses on the tapped type when all are selected', () => {
    expect(toggleType(SPARK_TYPES, 'hotTake')).toEqual(['hotTake']);
  });

  it('adds and removes types, keeping display order', () => {
    expect(toggleType(['whatIf'], 'debate')).toEqual(['debate', 'whatIf']);
    expect(toggleType(['debate', 'whatIf'], 'debate')).toEqual(['whatIf']);
  });

  it('goes back to all types instead of none', () => {
    expect(toggleType(['memoryLane'], 'memoryLane')).toEqual([...SPARK_TYPES]);
  });
});

describe('filtersForMode', () => {
  it('keeps the type chips in Sparks and uses ideas in Brainstorm', () => {
    const filters = { ...defaultFilters, types: ['debate' as const], vibe: 'deep' as const };
    expect(filtersForMode('sparks', filters)).toBe(filters);
    expect(filtersForMode('brainstorm', filters)).toEqual({ ...filters, types: ['idea'] });
  });
});

describe('filtersForMode for Oracle', () => {
  it('uses the Ask/Fortune chip as the only type', () => {
    expect(filtersForMode('oracle', defaultFilters).types).toEqual(['answer']);
    expect(filtersForMode('oracle', defaultFilters, 'fortune').types).toEqual(['fortune']);
  });
});
