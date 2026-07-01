import type { Comment } from '@/domain/entities/comment';

/**
 * Port des commentaires (ADR-0010). La présentation dépend de CETTE interface.
 * Réservé aux membres du groupe du post côté serveur (RLS).
 */
export interface CommentRepository {
  /** Commentaires d'un post, du plus ancien au plus récent. */
  listForItem(feedItemId: string): Promise<Comment[]>;
  /** Ajoute un commentaire (auteur = utilisateur courant). */
  add(feedItemId: string, text: string): Promise<void>;
}
