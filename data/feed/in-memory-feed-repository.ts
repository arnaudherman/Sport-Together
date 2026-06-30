import { EMPTY_REACTIONS, type FeedItem } from '@/domain/entities/feed';
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

  async logSession(groupId: string, activity: string, durationMin?: number): Promise<void> {
    this.items.push({
      id: `local-${this.items.length + 1}`,
      groupId,
      authorId: this.viewerId,
      authorName: 'Moi',
      type: 'session',
      createdAt: new Date().toISOString(),
      summary: durationMin ? `${activity} · ${durationMin} min` : activity,
    });
  }
}

/** Données de démonstration pour le mode hors-ligne (un seul groupe). */
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
