import type { Profile, ProfileInput } from '@/domain/entities/profile';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

/** Profils de démonstration (mode hors-ligne) — pour afficher de vraies bios. */
const DEMO_PROFILES: Record<string, Profile> = {
  'u-lea': { id: 'u-lea', pseudo: 'Léa', isAdult: true, bio: 'Coureuse, lève-tôt. Jamais deux jours sans. 🏃‍♀️' },
  'u-sam': { id: 'u-sam', pseudo: 'Sam', isAdult: true, bio: 'Vélo & natation. On garde le rythme 🚴' },
  'u-noa': { id: 'u-noa', pseudo: 'Noa', isAdult: true, bio: 'Muscu et bonne bouffe 💪🥗' },
};

/** Mock de ProfileRepository (hors-ligne / tests). Démarre non-onboardé. */
export class InMemoryProfileRepository implements ProfileRepository {
  private profile: Profile = { id: 'local-user', pseudo: 'Nouveau membre', isAdult: false };

  async getMyProfile(): Promise<Profile | null> {
    return this.profile;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    if (userId === this.profile.id) return this.profile;
    return DEMO_PROFILES[userId] ?? null;
  }

  async updateAvatar(localUri: string): Promise<Profile> {
    this.profile = { ...this.profile, avatarUrl: localUri };
    return this.profile;
  }

  async updateMyProfile(input: ProfileInput): Promise<Profile> {
    this.profile = {
      ...this.profile,
      pseudo: input.pseudo,
      avatarUrl: input.avatarUrl ?? this.profile.avatarUrl,
      isAdult: input.isAdult,
      bio: input.bio !== undefined ? input.bio : this.profile.bio,
    };
    return this.profile;
  }
}
