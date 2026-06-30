import type { SupabaseClient } from '@supabase/supabase-js';

import type { AuthRepository } from '@/domain/repositories/auth-repository';

/**
 * Implémentation Supabase de l'AuthRepository (ADR-0005). Magic link par code OTP
 * e-mail. data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async requestEmailOtp(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email: email.trim(),
    });
    if (error) throw new Error(error.message);
  }

  async verifyEmailOtp(email: string, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw new Error(error.message);
  }

  async getCurrentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  onAuthChange(listener: (userId: string | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }
}
