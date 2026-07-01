import type { CommentRepository } from '@/domain/repositories/comment-repository';

import type { InMemoryCommentStore } from '@/data/comment/in-memory-comment-store';
import type { Comment } from '@/domain/entities/comment';

/** Mock de CommentRepository (hors-ligne / tests). Store partagé avec le feed. */
export class InMemoryCommentRepository implements CommentRepository {
  constructor(
    private readonly store: InMemoryCommentStore,
    private readonly viewerId = 'local-user',
  ) {}

  async listForItem(feedItemId: string): Promise<Comment[]> {
    return this.store.list(feedItemId);
  }

  async remove(commentId: string): Promise<void> {
    this.store.remove(commentId);
  }

  async add(feedItemId: string, text: string): Promise<void> {
    this.store.add({
      id: `c-${feedItemId}-${this.store.count(feedItemId) + 1}-${text.length}`,
      feedItemId,
      authorId: this.viewerId,
      authorName: 'Moi',
      text,
      createdAt: new Date().toISOString(),
    });
  }
}
