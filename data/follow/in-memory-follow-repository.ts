import type { FollowRepository } from '@/domain/repositories/follow-repository';

/**
 * Mock d'abonnements (hors-ligne / tests). Pré-seedé pour que l'onglet
 * « Abonnements » de l'accueil ait du contenu en démo (on suit Léa, Sam, Noa).
 */
export class InMemoryFollowRepository implements FollowRepository {
  // On suit Sam au départ (l'onglet Abonnements a du contenu) ; Léa & Noa restent
  // « à découvrir » dans l'écran Découvrir (membres de groupe non suivis).
  private readonly following = new Set<string>(['u-sam']);

  // Qui me suit (démo) : Léa et Noa me suivent déjà.
  private readonly followers = new Set<string>(['u-lea', 'u-noa']);

  async listFollowing(): Promise<string[]> {
    return [...this.following];
  }

  async listFollowers(): Promise<string[]> {
    return [...this.followers];
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
