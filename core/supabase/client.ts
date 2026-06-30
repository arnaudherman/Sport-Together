import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/core/env';

/**
 * Client Supabase unique (ADR-0001 / ADR-0007). Vit dans core/, injecté dans les
 * repositories de data/ ; la présentation ne le touche jamais.
 *
 * TODO(ADR-0005): remplacer AsyncStorage par un adaptateur chiffré adossé à
 * expo-secure-store (pattern « LargeSecureStore ») avant la production.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
