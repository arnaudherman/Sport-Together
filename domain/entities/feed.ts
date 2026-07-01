/**
 * Entités du feed — voir ADR-0002 (modèle de feed polymorphe).
 *
 * Le feed est polymorphe : chaque entrée porte un `type` discriminant et des
 * attributs communs (table FEED_ITEMS). Les détails spécifiques d'un type
 * (séance, repas…) vivent dans des types/tables dédiés reliés à l'entrée.
 */

export type FeedItemType = 'session' | 'steps' | 'meal';

/** Réactions positives uniquement (vision §8 : jamais punitif). */
export type ReactionKind = 'kudos' | 'encouragement';

/** Agrégat des réactions d'une entrée, et celles de l'utilisateur courant. */
export interface ReactionSummary {
  kudos: number;
  encouragement: number;
  mine: ReactionKind[];
}

/** Attributs communs à toute entrée du feed (FEED_ITEMS, ADR-0002). */
export interface FeedItem {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  type: FeedItemType;
  /** Horodatage ISO 8601 (UTC). */
  createdAt: string;
  /** Résumé court affiché dans le feed (« 30 min de course »). */
  summary: string;
  /** Présent quand l'entrée est lue via un repository ; absent ailleurs. */
  reactions?: ReactionSummary;
  /** Nombre de commentaires (présent quand lu via un repository). */
  commentCount?: number;
  /**
   * Nom du groupe d'où provient l'entrée, pour le badge dans l'accueil solo.
   * Absent = post « solo » / d'un abonnement (pas via un groupe).
   */
  groupName?: string;
}

/** Agrégat vide réutilisable. */
export const EMPTY_REACTIONS: ReactionSummary = { kudos: 0, encouragement: 0, mine: [] };
