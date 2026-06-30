import { type ReactionKind, type ReactionSummary } from '@/domain/entities/feed';

const KINDS: ReactionKind[] = ['kudos', 'encouragement'];

/**
 * État partagé des réactions pour le mode hors-ligne / tests. Partagé entre le
 * feed et le repository de réactions (injecté dans les deux) pour rester cohérent.
 */
export class InMemoryReactionStore {
  private readonly byItem = new Map<string, Map<ReactionKind, Set<string>>>();

  add(feedItemId: string, kind: ReactionKind, userId: string): void {
    const byKind = this.byItem.get(feedItemId) ?? new Map<ReactionKind, Set<string>>();
    const users = byKind.get(kind) ?? new Set<string>();
    users.add(userId);
    byKind.set(kind, users);
    this.byItem.set(feedItemId, byKind);
  }

  remove(feedItemId: string, kind: ReactionKind, userId: string): void {
    this.byItem.get(feedItemId)?.get(kind)?.delete(userId);
  }

  summaryFor(feedItemId: string, viewerId: string): ReactionSummary {
    const byKind = this.byItem.get(feedItemId);
    const mine = KINDS.filter((kind) => byKind?.get(kind)?.has(viewerId));
    return {
      kudos: byKind?.get('kudos')?.size ?? 0,
      encouragement: byKind?.get('encouragement')?.size ?? 0,
      mine,
    };
  }
}
