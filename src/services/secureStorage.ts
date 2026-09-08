import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let availabilityPromise: Promise<boolean> | null = null;

const toSecureStoreKey = (key: string) =>
  key.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '.');

const ensureSecureStore = async () => {
  availabilityPromise ??= SecureStore.isAvailableAsync();
  if (!(await availabilityPromise)) {
    throw new Error('Secure storage is unavailable on this device.');
  }
};

/**
 * Uses OS-backed encrypted storage on Android/iOS. Web keeps non-token app
 * preferences in AsyncStorage because browser cookies own the web session.
 */
export const privateStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }

    await ensureSecureStore();
    const secureKey = toSecureStoreKey(key);
    const securedValue = await SecureStore.getItemAsync(secureKey, SECURE_STORE_OPTIONS);
    if (securedValue !== null) {
      return securedValue;
    }

    // One-time migration from the previous plaintext AsyncStorage location.
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue !== null) {
      await SecureStore.setItemAsync(secureKey, legacyValue, SECURE_STORE_OPTIONS);
      await AsyncStorage.removeItem(key);
    }
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }

    await ensureSecureStore();
    await SecureStore.setItemAsync(toSecureStoreKey(key), value, SECURE_STORE_OPTIONS);
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }

    await ensureSecureStore();
    await SecureStore.deleteItemAsync(toSecureStoreKey(key), SECURE_STORE_OPTIONS);
    await AsyncStorage.removeItem(key);
  },
};
