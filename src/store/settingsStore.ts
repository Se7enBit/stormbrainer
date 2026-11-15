import { create } from 'zustand';

import { toAiProblem, type AiErrorKind, type AiProblem } from '../ai/provider';
import { getString, removeKey, setString } from '../storage/kv';
import { loadApiKey, removeApiKey, saveApiKey } from '../storage/secureKey';
import { configureAi, currentProvider } from './ai';

const MODEL_KEY = 'stormbrainer.model';
const WORK_SAFE_KEY = 'stormbrainer.workSafeDefault';

/** Problems only fixable in Settings. */
const NEEDS_SETTINGS: readonly AiErrorKind[] = ['invalidKey', 'modelNotFound'];

/** none: no key saved; saved: saved but not tested yet; ok: last test passed. */
export type KeyStatus = 'none' | 'saved' | 'testing' | 'ok' | AiErrorKind;

interface SettingsState {
  /** Stored settings have been read. */
  hydrated: boolean;
  /** Whether a key is saved. The key itself is never kept in state. */
  hasKey: boolean;
  keyStatus: KeyStatus;
  /** The provider's own words for the last Test key failure, if any. */
  keyDetail: string | null;
  /** The model that answered the last passing Test key. */
  workingModel: string | null;
  /** The last AI failure while drawing sparks (cleared by a passing Test key). */
  lastProblem: AiProblem | null;
  /** Model override from Advanced; empty means the default. */
  model: string;
  /** Work-safe toggle position at startup. */
  workSafeDefault: boolean;
  load: () => Promise<void>;
  /** Save a pasted key, then test it. */
  saveKey: (apiKey: string) => Promise<void>;
  removeKey: () => Promise<void>;
  testKey: () => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setWorkSafeDefault: (workSafe: boolean) => Promise<void>;
  /** A spark request failed: remember it for Settings; a bad key or model also sets keyStatus. */
  reportAiProblem: (problem: AiProblem) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  hydrated: false,
  hasKey: false,
  keyStatus: 'none',
  keyDetail: null,
  workingModel: null,
  lastProblem: null,
  model: '',
  workSafeDefault: false,

  load: async () => {
    const [apiKey, model, workSafe] = await Promise.all([
      loadApiKey(),
      getString(MODEL_KEY),
      getString(WORK_SAFE_KEY),
    ]);
    configureAi(apiKey, model ?? '');
    set({
      hydrated: true,
      hasKey: Boolean(apiKey),
      keyStatus: apiKey ? 'saved' : 'none',
      model: model ?? '',
      workSafeDefault: workSafe === 'true',
    });
  },

  saveKey: async (input) => {
    const apiKey = input.trim();
    if (!apiKey) return;
    await saveApiKey(apiKey);
    configureAi(apiKey, get().model);
    set({ hasKey: true, keyStatus: 'saved', keyDetail: null, lastProblem: null });
    await get().testKey();
  },

  removeKey: async () => {
    await removeApiKey();
    configureAi(null, get().model);
    set({ hasKey: false, keyStatus: 'none', keyDetail: null, lastProblem: null });
  },

  testKey: async () => {
    const provider = currentProvider();
    if (!provider) return;
    set({ keyStatus: 'testing', keyDetail: null, workingModel: null });
    try {
      const { model } = await provider.testKey();
      if (currentProvider() === provider) {
        set({ keyStatus: 'ok', workingModel: model, lastProblem: null });
      }
    } catch (error) {
      if (currentProvider() === provider) {
        const problem = toAiProblem(error);
        set({ keyStatus: problem.kind, keyDetail: problem.detail ?? null });
      }
    }
  },

  setModel: async (input) => {
    const model = input.trim();
    if (model === get().model) return;
    if (model) await setString(MODEL_KEY, model);
    else await removeKey(MODEL_KEY);
    const apiKey = get().hasKey ? await loadApiKey() : null;
    configureAi(apiKey, model);
    set({ model, keyStatus: apiKey ? 'saved' : 'none', keyDetail: null, lastProblem: null });
  },

  setWorkSafeDefault: async (workSafe) => {
    set({ workSafeDefault: workSafe });
    await setString(WORK_SAFE_KEY, String(workSafe));
  },

  reportAiProblem: (problem) => {
    if (!get().hasKey) return;
    set({ lastProblem: problem });
    if (NEEDS_SETTINGS.includes(problem.kind)) {
      set({ keyStatus: problem.kind, keyDetail: problem.detail ?? null });
    }
  },
}));
