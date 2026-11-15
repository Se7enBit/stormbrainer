import * as SecureStore from 'expo-secure-store';

// Native: the API key lives in the OS keychain/keystore. secureKey.web.ts is the web version.

const STORAGE_KEY = 'stormbrainer.geminiApiKey';

export async function loadApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, apiKey);
}

export async function removeApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
