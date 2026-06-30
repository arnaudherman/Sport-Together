import type { FeedItem } from '@/domain/entities/feed';

/**
 * Port du feed (ADR-0007). La présentation dépend de CETTE interface, jamais
 * d'une implémentation concrète ni du SDK Supabase. Les implémentations vivent
 * dans `data/` ; un mock en mémoire sert aux tests et au mode hors-ligne.
 */
export interface FeedRepository {
  /** Entrées du feed d'un groupe, du plus récent au plus ancien (ADR-0002). */
  listGroupFeed(groupId: string): Promise<FeedItem[]>;
  /** Logge une séance dans le groupe (entrée de feed de type `session`). */
  logSession(groupId: string, activity: string, durationMin?: number): Promise<void>;
}
