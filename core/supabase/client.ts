import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { env } from '@/core/env';

/**
 * Stockage de session CHIFFRÉ (ADR-0005) adossé à expo-secure-store (Keychain iOS
 * / Keystore Android). Le jeton de session n'est JAMAIS en clair. La valeur est
 * découpée en morceaux < limite SecureStore (~2 Ko), donc robuste aux sessions
 * volumineuses.
 */
const CHUNK = 1800;

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(`${key}.0`);
    if (head === null) return null;
    let value = head;
    for (let i = 1; ; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) break;
      value += part;
    }
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const chunks = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string): Promise<void> {
    for (let i = 0; ; i += 1) {
      const existed = await SecureStore.getItemAsync(`${key}.${i}`);
      if (existed === null) break;
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    }
  },
};

/**
 * Client Supabase unique (ADR-0001 / ADR-0007). Vit dans core/, injecté dans les
 * repositories de data/ ; la présentation ne le touche jamais.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: secureStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
