import { create } from 'zustand';

import { mergeSaved, parseSaved, removeSaved, toggleSaved } from '../sparks/saved';
import type { Spark } from '../sparks/types';
import { getString, setString } from '../storage/kv';

const SAVED_KEY = 'stormbrainer.saved';

interface SavedState {
  /** Starred sparks, newest first. */
  saved: Spark[];
  hydrated: boolean;
  load: () => Promise<void>;
  toggle: (spark: Spark) => void;
  remove: (spark: Spark) => void;
}

export const useSavedStore = create<SavedState>()((set, get) => {
  const persist = () => {
    setString(SAVED_KEY, JSON.stringify(get().saved)).catch(() => {
      // Storage full or unavailable: the list still works for this session.
    });
  };

  return {
    saved: [],
    hydrated: false,
    load: async () => {
      const stored = parseSaved(await getString(SAVED_KEY));
      // Anything starred before loading finished stays on top.
      set(({ saved }) => ({ saved: mergeSaved(saved, stored), hydrated: true }));
    },
    toggle: (spark) => {
      set(({ saved }) => ({ saved: toggleSaved(saved, spark) }));
      persist();
    },
    remove: (spark) => {
      set(({ saved }) => ({ saved: removeSaved(saved, spark) }));
      persist();
    },
  };
});
