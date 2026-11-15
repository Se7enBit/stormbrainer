import { allTypesSelected, defaultFilters, toggleType } from './filters';
import { SPARK_TYPES } from './types';

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
