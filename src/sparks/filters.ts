import { MODE_TYPES, modeOf, type Mode, type SparkFilters, type SparkType } from './types';

/** Sparks' type chips. */
const CHIP_TYPES = MODE_TYPES.sparks;

export const defaultFilters: SparkFilters = {
  types: [...CHIP_TYPES],
  vibe: 'light',
  workSafe: false,
};

export function allTypesSelected(types: readonly SparkType[]): boolean {
  return CHIP_TYPES.every((t) => types.includes(t));
}

/**
 * Type chip tap. Built for one-tap focus:
 * - all selected → only the tapped type;
 * - otherwise toggle it; deselecting the last one goes back to all.
 * The result is never empty and keeps the chips' display order.
 */
export function toggleType(types: readonly SparkType[], type: SparkType): SparkType[] {
  if (allTypesSelected(types)) return [type];
  const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
  if (next.length === 0) return [...CHIP_TYPES];
  return CHIP_TYPES.filter((t) => next.includes(t));
}

/** The filters a draw uses: Sparks uses the type chips, other modes their own card type. */
export function filtersForMode(mode: Mode, filters: SparkFilters): SparkFilters {
  return mode === 'sparks' ? filters : { ...filters, types: [...MODE_TYPES[mode]] };
}

export { modeOf };
