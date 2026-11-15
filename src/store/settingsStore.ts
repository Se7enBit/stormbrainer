import { create } from 'zustand';

import { isAiError, type AiErrorKind } from '../ai/provider';
import { getString, removeKey, setString } from '../storage/kv';
import { loadApiKey, removeApiKey, saveApiKey } from '../storage/secureKey';
import { configureAi, currentProvider } from './ai';

const MODEL_KEY = 'stormbrainer.model';
const WORK_SAFE_KEY = 'stormbrainer.workSafeDefault';

/** none: no key saved; saved: saved but not tested yet; ok: last test passed. */
export type KeyStatus = 'none' | 'saved' | 'testing' | 'ok' | AiErrorKind;

interface SettingsState {
  /** Stored settings have been read. */
  hydrated: boolean;
  /** Whether a key is saved. The key itself is never kept in state. */
  hasKey: boolean;
  keyStatus: KeyStatus;
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
  /** A spark request found the key or model unusable: show it in Settings. */
  reportAiError: (kind: AiErrorKind) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  hydrated: false,
  hasKey: false,
  keyStatus: 'none',
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
    set({ hasKey: true, keyStatus: 'saved' });
    await get().testKey();
  },

  removeKey: async () => {
    await removeApiKey();
    configureAi(null, get().model);
    set({ hasKey: false, keyStatus: 'none' });
  },

  testKey: async () => {
    const provider = currentProvider();
    if (!provider) return;
    set({ keyStatus: 'testing' });
    try {
      await provider.testKey();
      if (currentProvider() === provider) set({ keyStatus: 'ok' });
    } catch (error) {
      if (currentProvider() === provider) {
        set({ keyStatus: isAiError(error) ? error.kind : 'badResponse' });
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
    set({ model, keyStatus: apiKey ? 'saved' : 'none' });
  },

  setWorkSafeDefault: async (workSafe) => {
    set({ workSafeDefault: workSafe });
    await setString(WORK_SAFE_KEY, String(workSafe));
  },

  reportAiError: (kind) => {
    if (get().hasKey) set({ keyStatus: kind });
  },
}));
