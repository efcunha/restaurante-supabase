import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Adapter to use Expo SecureStore for Supabase Auth storage on mobile devices.
 * Falls back to AsyncStorage on Web (where SecureStore is not available).
 *
 * Supabase session JSON can exceed the SecureStore 2 048-byte limit.
 * Large values are split into 1 800-byte chunks stored under
 * `<key>__chunk_0`, `<key>__chunk_1`, … with a manifest key `<key>__chunks`
 * that records the total chunk count.
 *
 * Implements the SupabaseClientOptions['auth']['storage'] interface.
 */

const CHUNK_SIZE = 1_800; // safe margin below 2 048-byte SecureStore limit
const chunkCountKey = (key: string) => `${key}__chunks`;
const chunkKey = (key: string, i: number) => `${key}__chunk_${i}`;

async function setItemChunked(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    // Small enough — store directly and make sure no leftover chunks exist
    await SecureStore.setItemAsync(key, value);
    await SecureStore.deleteItemAsync(chunkCountKey(key));
    return;
  }

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk))
  );
  await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
  // Remove the plain key so getItem always reads via chunks
  await SecureStore.deleteItemAsync(key);
}

async function getItemChunked(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(chunkCountKey(key));
  if (!countStr) {
    // No chunked value — fall back to plain key
    return SecureStore.getItemAsync(key);
  }

  const count = parseInt(countStr, 10);
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i)))
  );

  if (parts.some((p) => p === null)) return null;
  return (parts as string[]).join('');
}

async function removeItemChunked(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(chunkCountKey(key));
  if (countStr) {
    const count = parseInt(countStr, 10);
    await Promise.all([
      ...Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, i))
      ),
      SecureStore.deleteItemAsync(chunkCountKey(key)),
    ]);
  }
  await SecureStore.deleteItemAsync(key);
}

const SecureStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return getItemChunked(key);
  },

  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return setItemChunked(key, value);
  },

  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return removeItemChunked(key);
  },
};

export default SecureStorageAdapter;
