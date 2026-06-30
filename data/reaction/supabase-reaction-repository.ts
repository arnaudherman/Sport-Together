import type { SupabaseClient } from '@supabase/supabase-js';

import type { ReactionKind } from '@/domain/entities/feed';
import type { ReactionRepository } from '@/domain/repositories/reaction-repository';

/**
 * Implémentation Supabase du ReactionRepository (ADR-0002 / ADR-0004). L'auteur
 * est l'utilisateur courant (exigé par la RLS) ; group_id rempli par trigger.
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseReactionRepository implements ReactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async userId(): Promise<string> {
    // Session LOCALE (pas de round-trip réseau) ; l'identité réelle reste imposée
    // par la RLS (author_id = auth.uid()) côté serveur.
    const { data } = await this.client.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw new Error('Non authentifié');
    return uid;
  }

  async add(feedItemId: string, kind: ReactionKind): Promise<void> {
    const uid = await this.userId();
    const { error } = await this.client
      .from('reactions')
      .insert({ feed_item_id: feedItemId, author_id: uid, kind });
    if (error) throw new Error(error.message);
  }

  async remove(feedItemId: string, kind: ReactionKind): Promise<void> {
    const uid = await this.userId();
    const { error } = await this.client
      .from('reactions')
      .delete()
      .eq('feed_item_id', feedItemId)
      .eq('author_id', uid)
      .eq('kind', kind);
    if (error) throw new Error(error.message);
  }
}
