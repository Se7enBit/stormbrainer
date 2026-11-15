import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small key-value store for non-secret settings (AsyncStorage: localStorage on web).
 * Never put the API key here; that goes through secureKey.
 */
export async function getString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
