import type { FeedItem } from '@/domain/entities/feed';
import type { MealInput } from '@/domain/entities/meal';

/**
 * Port du feed (ADR-0007). La présentation dépend de CETTE interface, jamais
 * d'une implémentation concrète ni du SDK Supabase. Les implémentations vivent
 * dans `data/` ; un mock en mémoire sert aux tests et au mode hors-ligne.
 */
export interface FeedRepository {
  /** Entrées du feed d'un groupe, du plus récent au plus ancien (ADR-0002). */
  listGroupFeed(groupId: string): Promise<FeedItem[]>;
  /** Logge une séance (entrée de type `session`). */
  logSession(groupId: string, activity: string, durationMin?: number): Promise<void>;
  /** Logge un relevé de pas (entrée de type `steps`). */
  logSteps(groupId: string, steps: number): Promise<void>;
  /** Logge un repas (entrée de type `meal`) — valider avec validateMeal en amont. */
  logMeal(groupId: string, meal: MealInput): Promise<void>;
}
