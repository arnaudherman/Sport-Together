import type { SupabaseClient } from '@supabase/supabase-js';

import type { Comment } from '@/domain/entities/comment';
import type { CommentRepository } from '@/domain/repositories/comment-repository';

type OneOrMany<T> = T | T[] | null;

interface CommentRow {
  id: string;
  feed_item_id: string;
  author_id: string | null;
  text: string;
  created_at: string;
  author: OneOrMany<{ pseudo: string }>;
}

/**
 * Implémentation Supabase des commentaires (ADR-0010). RLS : membres du groupe
 * du post uniquement. data/ est la seule couche autorisée à importer le SDK.
 */
export class SupabaseCommentRepository implements CommentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForItem(feedItemId: string): Promise<Comment[]> {
    const { data, error } = await this.client
      .from('comments')
      .select('id, feed_item_id, author_id, text, created_at, author:profiles(pseudo)')
      .eq('feed_item_id', feedItemId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as CommentRow[]).map((row) => {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      return {
        id: row.id,
        feedItemId: row.feed_item_id,
        authorId: row.author_id ?? '',
        authorName: author?.pseudo ?? 'Membre supprimé',
        text: row.text,
        createdAt: row.created_at,
      };
    });
  }

  async add(feedItemId: string, text: string): Promise<void> {
    const { data } = await this.client.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw new Error('Non authentifié');
    const { error } = await this.client
      .from('comments')
      .insert({ feed_item_id: feedItemId, author_id: uid, text });
    if (error) throw new Error(error.message);
  }
}
