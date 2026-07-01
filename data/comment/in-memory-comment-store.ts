import type { Comment } from '@/domain/entities/comment';

/**
 * État partagé des commentaires (hors-ligne / tests). Partagé entre le
 * CommentRepository (liste/ajout) et le FeedRepository (compteur par post).
 */
export class InMemoryCommentStore {
  private readonly byItem = new Map<string, Comment[]>();

  list(feedItemId: string): Comment[] {
    return [...(this.byItem.get(feedItemId) ?? [])].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  count(feedItemId: string): number {
    return this.byItem.get(feedItemId)?.length ?? 0;
  }

  add(comment: Comment): void {
    const list = this.byItem.get(comment.feedItemId) ?? [];
    list.push(comment);
    this.byItem.set(comment.feedItemId, list);
  }

  remove(commentId: string): void {
    for (const [itemId, list] of this.byItem) {
      const next = list.filter((c) => c.id !== commentId);
      if (next.length !== list.length) this.byItem.set(itemId, next);
    }
  }
}

/** Commentaires de démonstration (mode hors-ligne). */
export const DEMO_COMMENTS: Comment[] = [
  { id: 'cm1', feedItemId: 'd0-lea-s', authorId: 'u-sam', authorName: 'Sam', text: 'Bien joué 👏 tu tiens le rythme !', createdAt: '2026-07-01T06:00:00.000Z' },
  { id: 'cm2', feedItemId: 'd0-lea-s', authorId: 'local-user', authorName: 'Moi', text: 'Motivant, je te suis demain 6h 💪', createdAt: '2026-07-01T06:05:00.000Z' },
  { id: 'cm3', feedItemId: 'd0-noa-m', authorId: 'u-lea', authorName: 'Léa', text: 'Ça donne faim !', createdAt: '2026-07-01T07:00:00.000Z' },
];
