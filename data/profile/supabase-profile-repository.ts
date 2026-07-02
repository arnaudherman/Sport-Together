import type { SupabaseClient } from '@supabase/supabase-js';

import type { Profile, ProfileInput } from '@/domain/entities/profile';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

interface ProfileRow {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  is_adult: boolean;
  bio: string | null;
}

const PROFILE_SELECT = 'id, pseudo, avatar_url, is_adult, bio';

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    pseudo: row.pseudo,
    avatarUrl: row.avatar_url ?? undefined,
    isAdult: row.is_adult,
    bio: row.bio ?? undefined,
  };
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
      .select(PROFILE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data as ProfileRow) : null;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data as ProfileRow) : null;
  }

  async updateAvatar(localUri: string): Promise<Profile> {
    const { data: session } = await this.client.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) throw new Error('Non authentifié');
    const path = `${uid}/avatar-${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { error: upErr } = await this.client.storage
      .from('avatars')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = this.client.storage.from('avatars').getPublicUrl(path);
    const { data, error } = await this.client
      .from('profiles')
      .update({ avatar_url: pub.publicUrl })
      .eq('id', uid)
      .select(PROFILE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapProfile(data as ProfileRow);
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
    if (input.bio !== undefined) payload.bio = input.bio;

    const { data, error } = await this.client
      .from('profiles')
      .upsert(payload)
      .select(PROFILE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapProfile(data as ProfileRow);
  }
}
