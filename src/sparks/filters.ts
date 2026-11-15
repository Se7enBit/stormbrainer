import { SPARK_TYPES, type SparkFilters, type SparkType } from './types';

export const defaultFilters: SparkFilters = {
  types: [...SPARK_TYPES],
  vibe: 'light',
  workSafe: false,
};

export function allTypesSelected(types: readonly SparkType[]): boolean {
  return SPARK_TYPES.every((t) => types.includes(t));
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
  if (next.length === 0) return [...SPARK_TYPES];
  return SPARK_TYPES.filter((t) => next.includes(t));
}
