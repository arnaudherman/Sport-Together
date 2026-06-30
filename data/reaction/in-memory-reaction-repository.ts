import type { ReactionKind } from '@/domain/entities/feed';
import type { ReactionRepository } from '@/domain/repositories/reaction-repository';

import type { InMemoryReactionStore } from '@/data/reaction/in-memory-reaction-store';

/** Repository de réactions en mémoire (hors-ligne / tests), adossé au store partagé. */
export class InMemoryReactionRepository implements ReactionRepository {
  constructor(
    private readonly store: InMemoryReactionStore,
    private readonly viewerId = 'local-user',
  ) {}

  async add(feedItemId: string, kind: ReactionKind): Promise<void> {
    this.store.add(feedItemId, kind, this.viewerId);
  }

  async remove(feedItemId: string, kind: ReactionKind): Promise<void> {
    this.store.remove(feedItemId, kind, this.viewerId);
  }
}
