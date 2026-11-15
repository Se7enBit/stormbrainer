import { create } from 'zustand';

import { deck, drawFromDeck } from '../sparks/deck';
import { defaultFilters, toggleType } from '../sparks/filters';
import { emptyHistory, type History } from '../sparks/history';
import type { Spark, SparkFilters, SparkType, Vibe } from '../sparks/types';

interface SparkState {
  filters: SparkFilters;
  /** The card on screen, or null for the home screen. */
  current: Spark | null;
  history: History;
  /** Spark button and Next: show a new spark. */
  next: () => void;
  /**
   * Replace the card with another one for the same settings. With the offline deck this is the
   * same draw as `next`; the AI queue (milestone 3) is where the two can differ.
   */
  reroll: () => void;
  /** Back to the home screen. */
  close: () => void;
  toggleType: (type: SparkType) => void;
  setVibe: (vibe: Vibe) => void;
  setWorkSafe: (workSafe: boolean) => void;
}

export const useSparkStore = create<SparkState>()((set, get) => {
  const draw = () => {
    const { filters, history, current } = get();
    const result = drawFromDeck(deck, filters, history, Math.random, current);
    if (result) set({ current: result.spark, history: result.history });
  };

  return {
    filters: defaultFilters,
    current: null,
    history: emptyHistory,
    next: draw,
    reroll: draw,
    close: () => set({ current: null }),
    toggleType: (type) =>
      set(({ filters }) => ({ filters: { ...filters, types: toggleType(filters.types, type) } })),
    setVibe: (vibe) => set(({ filters }) => ({ filters: { ...filters, vibe } })),
    setWorkSafe: (workSafe) => set(({ filters }) => ({ filters: { ...filters, workSafe } })),
  };
});
