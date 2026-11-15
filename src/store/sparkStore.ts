import { create } from 'zustand';

import type { AiProblem } from '../ai/provider';
import { defaultFilters, filtersForMode, toggleType } from '../sparks/filters';
import { emptyHistory, recordShown, type History } from '../sparks/history';
import type { Mode, OracleType, Spark, SparkFilters, SparkType, Vibe } from '../sparks/types';
import { sparkSource } from './ai';
import { useSettingsStore } from './settingsStore';

interface SparkState {
  /** What the big button gives (SPEC §9). */
  mode: Mode;
  filters: SparkFilters;
  /** Brainstorm topic for AI ideas. */
  topic: string;
  /** Oracle's chip: Ask (answers) or Fortune. */
  oracleType: OracleType;
  /** One-line group context for AI sparks. */
  context: string;
  /** The card on screen, or null for the home screen. */
  current: Spark | null;
  history: History;
  /** True while a tap waits for AI (never longer than the source's wait limit). */
  loading: boolean;
  /** Why the last card came from the deck although a key is set. */
  aiProblem: AiProblem | null;
  /** Spark button and Next: show a new spark. */
  next: () => Promise<void>;
  /** Start fetching AI sparks for the current settings, so the next tap is instant. */
  prefetch: () => void;
  /** Replace the card with another one for the same settings (same draw as `next`). */
  reroll: () => Promise<void>;
  /** Back to the home screen. */
  close: () => void;
  /** Show a specific spark (e.g. one from Saved). */
  show: (spark: Spark) => void;
  /** Forget what was shown, so every spark can come up again. */
  clearHistory: () => void;
  toggleType: (type: SparkType) => void;
  setVibe: (vibe: Vibe) => void;
  setWorkSafe: (workSafe: boolean) => void;
  setContext: (context: string) => void;
  setMode: (mode: Mode) => void;
  setTopic: (topic: string) => void;
  setOracleType: (oracleType: OracleType) => void;
}

export const useSparkStore = create<SparkState>()((set, get) => {
  let busy = false;

  const draw = async () => {
    if (busy) return;
    busy = true;
    try {
      const { mode, filters, oracleType, context, topic, history, current } = get();
      const settings = { mode, filters: filtersForMode(mode, filters, oracleType), context, topic };
      const result = await sparkSource.next(settings, history, current, () =>
        set({ loading: true }),
      );
      const aiProblem = result?.aiProblem ?? null;
      set({
        ...(result && { current: result.spark, history: result.history }),
        aiProblem,
        loading: false,
      });
      if (aiProblem) useSettingsStore.getState().reportAiProblem(aiProblem);
      else if (result?.spark.source === 'ai') useSettingsStore.setState({ lastProblem: null });
    } finally {
      busy = false;
    }
  };

  return {
    mode: 'sparks',
    filters: defaultFilters,
    topic: '',
    oracleType: 'answer',
    context: '',
    current: null,
    history: emptyHistory,
    loading: false,
    aiProblem: null,
    next: draw,
    prefetch: () => {
      const { mode, filters, oracleType, context, topic, history } = get();
      sparkSource.prefetch(
        { mode, filters: filtersForMode(mode, filters, oracleType), context, topic },
        history,
      );
    },
    reroll: draw,
    close: () => set({ current: null }),
    show: (spark) =>
      set(({ history }) => ({ current: spark, history: recordShown(history, spark) })),
    clearHistory: () => set({ history: emptyHistory }),
    toggleType: (type) =>
      set(({ filters }) => ({ filters: { ...filters, types: toggleType(filters.types, type) } })),
    setVibe: (vibe) => set(({ filters }) => ({ filters: { ...filters, vibe } })),
    setWorkSafe: (workSafe) => set(({ filters }) => ({ filters: { ...filters, workSafe } })),
    setContext: (context) => set({ context }),
    setMode: (mode) => set({ mode }),
    setTopic: (topic) => set({ topic }),
    setOracleType: (oracleType) => set({ oracleType }),
  };
});
