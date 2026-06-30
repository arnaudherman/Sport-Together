import type { Profile, ProfileInput } from '@/domain/entities/profile';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

/** Mock de ProfileRepository (hors-ligne / tests). Démarre non-onboardé. */
export class InMemoryProfileRepository implements ProfileRepository {
  private profile: Profile = { id: 'local-user', pseudo: 'Nouveau membre', isAdult: false };

  async getMyProfile(): Promise<Profile | null> {
    return this.profile;
  }

  async updateMyProfile(input: ProfileInput): Promise<void> {
    this.profile = {
      ...this.profile,
      pseudo: input.pseudo,
      avatarUrl: input.avatarUrl,
      isAdult: input.isAdult,
    };
  }
}
