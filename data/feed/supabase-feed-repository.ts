import type { SupabaseClient } from '@supabase/supabase-js';

import type { FeedItem } from '@/domain/entities/feed';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

/**
 * Implémentation Supabase du FeedRepository.
 *
 * `data/` est la SEULE couche autorisée à importer `@supabase/supabase-js`
 * (ADR-0007, garanti par la règle ESLint `no-restricted-imports`). À
 * implémenter : requête RLS-scopée sur `feed_items` jointe aux tables de détail
 * (ADR-0002 / ADR-0004), puis mapping DTO -> FeedItem.
 */
export class SupabaseFeedRepository implements FeedRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listGroupFeed(_groupId: string): Promise<FeedItem[]> {
    // TODO(ADR-0002/0004): SELECT feed_items WHERE group_id = ... ORDER BY created_at DESC,
    // jointure aux tables de détail, mapping vers FeedItem. La RLS impose l'isolation.
    void this.client;
    throw new Error('SupabaseFeedRepository.listGroupFeed : non implémenté.');
  }
}
