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

  async updateMyProfile(input: ProfileInput): Promise<Profile> {
    const id = await this.uid();
    if (!id) throw new Error('Non authentifié');
    // upsert : robuste même si le trigger handle_new_user n'a pas (encore) créé la
    // ligne. On n'inclut avatar_url que s'il est fourni (sinon on n'écrase pas un
    // avatar existant). On renvoie la ligne persistée (pas de read-after-write).
    const payload: Record<string, unknown> = {
      id,
      pseudo: input.pseudo,
      is_adult: input.isAdult,
    };
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;

    const { data, error } = await this.client
      .from('profiles')
      .upsert(payload)
      .select('id, pseudo, avatar_url, is_adult')
      .single();
    if (error) throw new Error(error.message);
    const row = data as ProfileRow;
    return {
      id: row.id,
      pseudo: row.pseudo,
      avatarUrl: row.avatar_url ?? undefined,
      isAdult: row.is_adult,
    };
  }
}
