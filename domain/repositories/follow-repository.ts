/**
 * Port des abonnements (solo-first, ADR-0010). Le social solo passe par le follow :
 * suivre des gens fait remonter leurs posts dans l'onglet « Abonnements » de l'accueil.
 * La présentation dépend de CETTE interface, jamais d'une implémentation concrète.
 */
export interface FollowRepository {
  /** Ids des utilisateurs que je suis. */
  listFollowing(): Promise<string[]>;
  /** Est-ce que je suis cet utilisateur ? */
  isFollowing(userId: string): Promise<boolean>;
  /** Suivre un utilisateur (idempotent). */
  follow(userId: string): Promise<void>;
  /** Ne plus suivre (idempotent). */
  unfollow(userId: string): Promise<void>;
}
