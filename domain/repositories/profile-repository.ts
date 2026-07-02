import type { Profile, ProfileInput } from '@/domain/entities/profile';

export interface ProfileSearchResult {
  id: string;
  pseudo: string;
  avatarUrl?: string;
}

/**
 * Port du profil (ADR-0005 / ADR-0007). Le profil de l'utilisateur courant est
 * identifié côté serveur via auth.uid() (RLS) ; la présentation passe par cette
 * interface, jamais par le SDK Supabase. `updateMyProfile` renvoie le profil
 * persisté (évite un read-after-write fragile après l'onboarding).
 */
export interface ProfileRepository {
  getMyProfile(): Promise<Profile | null>;
  /** Profil public d'un autre utilisateur (pseudo, bio…) — visible via RLS. */
  getProfile(userId: string): Promise<Profile | null>;
  updateMyProfile(input: ProfileInput): Promise<Profile>;
  /** Change la photo de profil depuis une image locale ; renvoie le profil à jour. */
  updateAvatar(localUri: string): Promise<Profile>;
  /** Cherche des gens par pseudo (annuaire limité, ≥ 2 caractères). */
  searchProfiles(query: string): Promise<ProfileSearchResult[]>;
}
