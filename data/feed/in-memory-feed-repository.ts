import type { FeedItem } from '@/domain/entities/feed';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

/**
 * Implémentation en mémoire du FeedRepository. Sert de mock dans les tests et de
 * valeur par défaut du provider tant que l'implémentation Supabase n'est pas
 * câblée. Aucune dépendance à Supabase (ADR-0007).
 */
export class InMemoryFeedRepository implements FeedRepository {
  constructor(private readonly items: readonly FeedItem[] = DEMO_FEED) {}

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    return this.items
      .filter((item) => item.groupId === groupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Données de démonstration pour le scaffold (un seul groupe). */
export const DEMO_FEED: readonly FeedItem[] = [
  {
    id: 'f1',
    groupId: 'demo-group',
    authorId: 'u-lea',
    authorName: 'Léa',
    type: 'session',
    createdAt: '2026-06-30T07:10:00.000Z',
    summary: '30 min de course',
  },
  {
    id: 'f2',
    groupId: 'demo-group',
    authorId: 'u-sam',
    authorName: 'Sam',
    type: 'steps',
    createdAt: '2026-06-30T06:40:00.000Z',
    summary: '10 248 pas',
  },
  {
    id: 'f3',
    groupId: 'demo-group',
    authorId: 'u-noa',
    authorName: 'Noa',
    type: 'meal',
    createdAt: '2026-06-29T19:05:00.000Z',
    summary: 'Bowl poulet-quinoa',
  },
];
