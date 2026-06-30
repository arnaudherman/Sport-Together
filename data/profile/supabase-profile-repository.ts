import type { SupabaseClient } from '@supabase/supabase-js';

import type { Profile, ProfileInput } from '@/domain/entities/profile';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

interface ProfileRow {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  is_adult: boolean;
}

/**
 * Implémentation Supabase du ProfileRepository (ADR-0005). data/ est la seule
 * couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async uid(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async getMyProfile(): Promise<Profile | null> {
    const id = await this.uid();
    if (!id) return null;
    const { data, error } = await this.client
      .from('profiles')
      .select('id, pseudo, avatar_url, is_adult')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as ProfileRow;
    return {
      id: row.id,
      pseudo: row.pseudo,
      avatarUrl: row.avatar_url ?? undefined,
      isAdult: row.is_adult,
    };
  }

  async updateMyProfile(input: ProfileInput): Promise<void> {
    const id = await this.uid();
    if (!id) throw new Error('Non authentifié');
    // upsert : robuste même si le trigger handle_new_user n'a pas (encore) créé la ligne.
    const { error } = await this.client.from('profiles').upsert({
      id,
      pseudo: input.pseudo,
      avatar_url: input.avatarUrl ?? null,
      is_adult: input.isAdult,
    });
    if (error) throw new Error(error.message);
  }
}
