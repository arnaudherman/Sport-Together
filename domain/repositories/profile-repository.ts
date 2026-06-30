import type { Profile, ProfileInput } from '@/domain/entities/profile';

/**
 * Port du profil (ADR-0005 / ADR-0007). Le profil de l'utilisateur courant est
 * identifié côté serveur via auth.uid() (RLS) ; la présentation passe par cette
 * interface, jamais par le SDK Supabase. `updateMyProfile` renvoie le profil
 * persisté (évite un read-after-write fragile après l'onboarding).
 */
export interface ProfileRepository {
  getMyProfile(): Promise<Profile | null>;
  updateMyProfile(input: ProfileInput): Promise<Profile>;
}
