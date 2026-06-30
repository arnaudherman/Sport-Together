// Variables d'environnement publiques (préfixe EXPO_PUBLIC_, injectées au build).
// L'anon key est destinée au client : la RLS protège les données (ADR-0001/0004).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const env = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
};

/** Vrai si l'app est branchée à un projet Supabase ; sinon on tourne sur mocks. */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
