import {
  EMPTY_REACTIONS,
  type FeedItem,
  type FeedItemType,
} from '@/domain/entities/feed';
import type { MealInput } from '@/domain/entities/meal';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

import type { InMemoryReactionStore } from '@/data/reaction/in-memory-reaction-store';

/**
 * Implémentation en mémoire du FeedRepository. Sert de mock dans les tests et de
 * mode hors-ligne (aucun projet Supabase configuré). Aucune dépendance à Supabase
 * (ADR-0007). Le store de réactions est partagé avec le ReactionRepository.
 */
export class InMemoryFeedRepository implements FeedRepository {
  private items: FeedItem[];

  constructor(
    seed: readonly FeedItem[] = DEMO_FEED,
    private readonly reactions?: InMemoryReactionStore,
    private readonly viewerId = 'local-user',
  ) {
    this.items = [...seed];
  }

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    return this.items
      .filter((item) => item.groupId === groupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        ...item,
        reactions: this.reactions
          ? this.reactions.summaryFor(item.id, this.viewerId)
          : EMPTY_REACTIONS,
      }));
  }

  private push(groupId: string, type: FeedItemType, summary: string): void {
    this.items.push({
      id: `local-${this.items.length + 1}`,
      groupId,
      authorId: this.viewerId,
      authorName: 'Moi',
      type,
      createdAt: new Date().toISOString(),
      summary,
    });
  }

  async logSession(groupId: string, activity: string, durationMin?: number): Promise<void> {
    this.push(groupId, 'session', durationMin ? `${activity} · ${durationMin} min` : activity);
  }

  async logSteps(groupId: string, steps: number): Promise<void> {
    this.push(groupId, 'steps', `${steps} pas`);
  }

  async logMeal(groupId: string, meal: MealInput): Promise<void> {
    const calories = meal.caloriesKcal != null ? ` · ${meal.caloriesKcal} kcal` : '';
    this.push(groupId, 'meal', `${meal.label}${calories}`);
  }
}

/** Données de démonstration pour le mode hors-ligne (un seul groupe). */
const demoNow = Date.now();
const minutesAgo = (mins: number): string => new Date(demoNow - mins * 60_000).toISOString();

export const DEMO_FEED: readonly FeedItem[] = [
  {
    id: 'f0',
    groupId: 'demo-group',
    authorId: 'local-user',
    authorName: 'Moi',
    type: 'session',
    createdAt: minutesAgo(38),
    summary: '45 min de course — plus longue série cette semaine',
  },
  {
    id: 'f1',
    groupId: 'demo-group',
    authorId: 'u-lea',
    authorName: 'Léa',
    type: 'session',
    createdAt: minutesAgo(12),
    summary: '30 min de renforcement',
  },
  {
    id: 'f2',
    groupId: 'demo-group',
    authorId: 'u-sam',
    authorName: 'Sam',
    type: 'steps',
    createdAt: minutesAgo(74),
    summary: '10 248 pas',
  },
  {
    id: 'f3',
    groupId: 'demo-group',
    authorId: 'local-user',
    authorName: 'Moi',
    type: 'meal',
    createdAt: minutesAgo(200),
    summary: 'Bowl poulet-quinoa · 620 kcal',
  },
  {
    id: 'f4',
    groupId: 'demo-group',
    authorId: 'u-noa',
    authorName: 'Noa',
    type: 'meal',
    createdAt: minutesAgo(1500),
    summary: 'Salade César · 480 kcal',
  },
];
