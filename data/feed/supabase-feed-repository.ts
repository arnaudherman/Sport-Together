import type { SupabaseClient } from '@supabase/supabase-js';

import type { FeedItem, FeedItemType } from '@/domain/entities/feed';
import type { FeedRepository } from '@/domain/repositories/feed-repository';

type OneOrMany<T> = T | T[] | null;

interface FeedRow {
  id: string;
  group_id: string;
  author_id: string | null;
  type: FeedItemType;
  created_at: string;
  author: OneOrMany<{ pseudo: string }>;
  sessions: OneOrMany<{ activity: string; duration_min: number | null }>;
  step_logs: OneOrMany<{ steps: number }>;
  meals: OneOrMany<{ label: string; calories_kcal: number | null }>;
}

function pickOne<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function summarize(row: FeedRow): string {
  if (row.type === 'session') {
    const s = pickOne(row.sessions);
    if (!s) return 'Séance';
    return s.duration_min ? `${s.activity} · ${s.duration_min} min` : s.activity;
  }
  if (row.type === 'steps') {
    const s = pickOne(row.step_logs);
    return s ? `${s.steps} pas` : 'Pas';
  }
  const m = pickOne(row.meals);
  if (!m) return 'Repas';
  return m.calories_kcal != null ? `${m.label} · ${m.calories_kcal} kcal` : m.label;
}

/**
 * Implémentation Supabase du FeedRepository (ADR-0002 / ADR-0004). Lit le feed
 * polymorphe d'un groupe (jointures auteur + tables de détail), trié du plus
 * récent au plus ancien. La RLS impose que seul un membre du groupe voie ces lignes.
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseFeedRepository implements FeedRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    const { data, error } = await this.client
      .from('feed_items')
      .select(
        'id, group_id, author_id, type, created_at, ' +
          'author:profiles(pseudo), ' +
          'sessions(activity, duration_min), ' +
          'step_logs(steps), ' +
          'meals(label, calories_kcal)',
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as FeedRow[];
    return rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      authorId: row.author_id ?? '',
      authorName: pickOne(row.author)?.pseudo ?? 'Membre supprimé',
      type: row.type,
      createdAt: row.created_at,
      summary: summarize(row),
    }));
  }

  async logSession(groupId: string, activity: string, durationMin?: number): Promise<void> {
    const { data: userData } = await this.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Non authentifié');

    // 1) entrée de feed (la colonne vertébrale, ADR-0002)
    const { data: created, error } = await this.client
      .from('feed_items')
      .insert({ group_id: groupId, author_id: userId, type: 'session' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    const feedItemId = (created as { id: string }).id;

    // 2) détail séance (group_id rempli par trigger). Rollback si échec.
    const { error: detailError } = await this.client
      .from('sessions')
      .insert({ feed_item_id: feedItemId, activity, duration_min: durationMin ?? null });
    if (detailError) {
      await this.client.from('feed_items').delete().eq('id', feedItemId);
      throw new Error(detailError.message);
    }
  }
}
