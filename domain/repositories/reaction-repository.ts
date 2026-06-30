import type { ReactionKind } from '@/domain/entities/feed';

/**
 * Port des réactions (ADR-0002 / ADR-0007). Réactions positives uniquement.
 * L'auteur est toujours l'utilisateur courant (imposé par la RLS côté serveur).
 */
export interface ReactionRepository {
  add(feedItemId: string, kind: ReactionKind): Promise<void>;
  remove(feedItemId: string, kind: ReactionKind): Promise<void>;
}
