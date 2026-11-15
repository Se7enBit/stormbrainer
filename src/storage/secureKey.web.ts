// Web: there is no secure store, so the key lives in this browser's localStorage (Settings says
// so). Same API as secureKey.ts.

const STORAGE_KEY = 'stormbrainer.geminiApiKey';

export async function loadApiKey(): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string): Promise<void> {
  globalThis.localStorage.setItem(STORAGE_KEY, apiKey);
}

export async function removeApiKey(): Promise<void> {
  globalThis.localStorage.removeItem(STORAGE_KEY);
}
