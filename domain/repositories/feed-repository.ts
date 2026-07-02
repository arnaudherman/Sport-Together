import type { FeedItem } from '@/domain/entities/feed';
import type { MealInput } from '@/domain/entities/meal';

/**
 * Port du feed (ADR-0007). La présentation dépend de CETTE interface, jamais
 * d'une implémentation concrète ni du SDK Supabase. Les implémentations vivent
 * dans `data/` ; un mock en mémoire sert aux tests et au mode hors-ligne.
 */
export interface FeedRepository {
  /**
   * Fil d'accueil (solo-first) : toutes les entrées que l'utilisateur peut voir
   * (ses posts + ses abonnements + ses groupes), du plus récent au plus ancien.
   */
  listHomeFeed(): Promise<FeedItem[]>;
  /** Entrées du feed d'un groupe, du plus récent au plus ancien (ADR-0002). */
  listGroupFeed(groupId: string): Promise<FeedItem[]>;
  /** Tous les posts d'un utilisateur (pour son profil), du plus récent au plus ancien. */
  listUserFeed(userId: string): Promise<FeedItem[]>;
  /** Logge une séance (photo locale optionnelle). `groupId` null = post solo (ADR-0010). */
  logSession(groupId: string | null, activity: string, durationMin?: number, photoUri?: string): Promise<void>;
  /** Logge un relevé de pas. `groupId` null = post solo. */
  logSteps(groupId: string | null, steps: number): Promise<void>;
  /** Logge un repas (valider avec validateMeal en amont, photo optionnelle). */
  logMeal(groupId: string | null, meal: MealInput, photoUri?: string): Promise<void>;
  /** Pose un jour de repos (protège le streak — vision §8). `groupId` null = post solo. */
  logRest(groupId: string | null): Promise<void>;
  /** Logge une nuit de sommeil (heures). `groupId` null = post solo. */
  logSleep(groupId: string | null, hours: number): Promise<void>;
  /** Supprime un post (réservé à son auteur par la RLS). */
  deletePost(feedItemId: string): Promise<void>;
}
