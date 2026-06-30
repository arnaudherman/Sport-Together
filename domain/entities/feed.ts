/**
 * Entités du feed — voir ADR-0002 (modèle de feed polymorphe).
 *
 * Le feed est polymorphe : chaque entrée porte un `type` discriminant et des
 * attributs communs (table FEED_ITEMS). Les détails spécifiques d'un type
 * (séance, repas…) vivront dans des types/tables dédiés reliés à l'entrée.
 */

export type FeedItemType = 'session' | 'steps' | 'meal';

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
}
