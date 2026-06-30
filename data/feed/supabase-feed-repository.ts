import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  FeedItem,
  FeedItemType,
  ReactionKind,
  ReactionSummary,
} from '@/domain/entities/feed';
import type { MealInput } from '@/domain/entities/meal';
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
  reactions: { kind: ReactionKind; author_id: string | null }[] | null;
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

function reactionSummary(rows: FeedRow['reactions'], viewerId: string): ReactionSummary {
  const list = rows ?? [];
  const mine: ReactionKind[] = [];
  if (list.some((r) => r.kind === 'kudos' && r.author_id === viewerId)) mine.push('kudos');
  if (list.some((r) => r.kind === 'encouragement' && r.author_id === viewerId)) {
    mine.push('encouragement');
  }
  return {
    kudos: list.filter((r) => r.kind === 'kudos').length,
    encouragement: list.filter((r) => r.kind === 'encouragement').length,
    mine,
  };
}

/**
 * Implémentation Supabase du FeedRepository (ADR-0002 / ADR-0004). Lit le feed
 * polymorphe d'un groupe (jointures auteur + détails + réactions) et logge les
 * différents types de goals. La RLS impose que seul un membre du groupe accède.
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseFeedRepository implements FeedRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    const { data: userData } = await this.client.auth.getUser();
    const viewerId = userData.user?.id ?? '';

    const { data, error } = await this.client
      .from('feed_items')
      .select(
        'id, group_id, author_id, type, created_at, ' +
          'author:profiles(pseudo), ' +
          'sessions(activity, duration_min), ' +
          'step_logs(steps), ' +
          'meals(label, calories_kcal), ' +
          'reactions(kind, author_id)',
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
      reactions: reactionSummary(row.reactions, viewerId),
    }));
  }

  /** Insère l'entrée de feed (colonne vertébrale, ADR-0002) et renvoie son id. */
  private async insertFeedItem(groupId: string, type: FeedItemType): Promise<string> {
    const { data: userData } = await this.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Non authentifié');

    const { data, error } = await this.client
      .from('feed_items')
      .insert({ group_id: groupId, author_id: userId, type })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  }

  private async rollback(feedItemId: string): Promise<void> {
    await this.client.from('feed_items').delete().eq('id', feedItemId);
  }

  async logSession(groupId: string, activity: string, durationMin?: number): Promise<void> {
    const feedItemId = await this.insertFeedItem(groupId, 'session');
    const { error } = await this.client
      .from('sessions')
      .insert({ feed_item_id: feedItemId, activity, duration_min: durationMin ?? null });
    if (error) {
      await this.rollback(feedItemId);
      throw new Error(error.message);
    }
  }

  async logSteps(groupId: string, steps: number): Promise<void> {
    const feedItemId = await this.insertFeedItem(groupId, 'steps');
    const { error } = await this.client
      .from('step_logs')
      .insert({ feed_item_id: feedItemId, steps });
    if (error) {
      await this.rollback(feedItemId);
      throw new Error(error.message);
    }
  }

  async logMeal(groupId: string, meal: MealInput): Promise<void> {
    const feedItemId = await this.insertFeedItem(groupId, 'meal');
    const { error } = await this.client.from('meals').insert({
      feed_item_id: feedItemId,
      label: meal.label,
      moment: meal.moment ?? null,
      calories_kcal: meal.caloriesKcal ?? null,
      protein_g: meal.proteinG ?? null,
      carbs_g: meal.carbsG ?? null,
      fat_g: meal.fatG ?? null,
    });
    if (error) {
      await this.rollback(feedItemId);
      throw new Error(error.message);
    }
  }
}
