import type { FollowRepository } from '@/domain/repositories/follow-repository';

/**
 * Mock d'abonnements (hors-ligne / tests). Pré-seedé pour que l'onglet
 * « Abonnements » de l'accueil ait du contenu en démo (on suit Léa, Sam, Noa).
 */
export class InMemoryFollowRepository implements FollowRepository {
  private readonly following = new Set<string>(['u-lea', 'u-sam', 'u-noa']);

  async listFollowing(): Promise<string[]> {
    return [...this.following];
  }

  async isFollowing(userId: string): Promise<boolean> {
    return this.following.has(userId);
  }

  async follow(userId: string): Promise<void> {
    this.following.add(userId);
  }

  async unfollow(userId: string): Promise<void> {
    this.following.delete(userId);
  }
}
