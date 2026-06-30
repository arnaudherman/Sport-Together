import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Fabrique du client Supabase (ADR-0001 / ADR-0007). Le client vit dans `core/`
 * et est injecté dans les implémentations de repository de `data/` ; la
 * présentation ne le touche jamais. L'adaptateur de stockage sécurisé du token
 * (expo-secure-store) et la config Auth seront câblés ici (ADR-0005).
 */
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // storage: secureStorageAdapter, // TODO(ADR-0005): expo-secure-store
    },
  });
}
