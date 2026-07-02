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
  group_id: string | null; // null = post solo (timeline perso)
  author_id: string | null;
  type: FeedItemType;
  created_at: string;
  author: OneOrMany<{ pseudo: string }>;
  group: OneOrMany<{ name: string }>;
  comment_count: { count: number }[] | null;
  sessions: OneOrMany<{ activity: string; duration_min: number | null }>;
  sleep_logs: OneOrMany<{ hours: number }>;
  step_logs: OneOrMany<{ steps: number }>;
  meals: OneOrMany<{ label: string; calories_kcal: number | null }>;
  reactions: { kind: ReactionKind; author_id: string | null }[] | null;
}

const FEED_SELECT =
  'id, group_id, author_id, type, created_at, ' +
  'author:profiles(pseudo), group:groups(name), comment_count:comments(count), ' +
  'sessions(activity, duration_min), step_logs(steps), sleep_logs(hours), ' +
  'meals(label, calories_kcal), reactions(kind, author_id)';

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
  if (row.type === 'rest') return 'Jour de repos 😴'; // pas de table de détail
  if (row.type === 'sleep') {
    const sl = pickOne(row.sleep_logs);
    return sl ? `${sl.hours} h de sommeil 🌙` : 'Sommeil 🌙';
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

function mapRow(row: FeedRow, viewerId: string): FeedItem {
  return {
    id: row.id,
    groupId: row.group_id ?? 'solo', // même convention que le mock (post sans groupe)
    authorId: row.author_id ?? '',
    authorName: pickOne(row.author)?.pseudo ?? 'Membre supprimé',
    type: row.type,
    createdAt: row.created_at,
    summary: summarize(row),
    reactions: reactionSummary(row.reactions, viewerId),
    groupName: pickOne(row.group)?.name ?? undefined,
    commentCount: row.comment_count?.[0]?.count ?? 0,
  };
}

/**
 * Implémentation Supabase du FeedRepository (ADR-0002 / ADR-0004). Lecture du feed
 * polymorphe (jointures auteur + détails + réactions) ; écriture via RPC atomiques
 * (log_session/steps/meal). La RLS impose que seul un membre du groupe accède.
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseFeedRepository implements FeedRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** Id du viewer depuis la session LOCALE (pas de round-trip réseau). */
  private async viewerId(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? '';
  }

  /**
   * Lecture générique du feed (les 3 variantes ne diffèrent que par un `.eq()`). La RLS
   * restreint en plus à ce qui est visible par l'utilisateur (groupes + abonnements).
   */
  private async listFeed(filter?: { column: 'group_id' | 'author_id'; value: string }): Promise<FeedItem[]> {
    const viewerId = await this.viewerId();
    let query = this.client.from('feed_items').select(FEED_SELECT);
    if (filter) query = query.eq(filter.column, filter.value);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as FeedRow[]).map((row) => mapRow(row, viewerId));
  }

  // Accueil solo-first : pas de filtre groupe, la RLS scope au visible.
  listHomeFeed(): Promise<FeedItem[]> {
    return this.listFeed();
  }

  listGroupFeed(groupId: string): Promise<FeedItem[]> {
    return this.listFeed({ column: 'group_id', value: groupId });
  }

  listUserFeed(userId: string): Promise<FeedItem[]> {
    return this.listFeed({ column: 'author_id', value: userId });
  }

  async logSession(groupId: string | null, activity: string, durationMin?: number): Promise<void> {
    // groupId null = post SOLO (timeline perso) — supporté par la RPC (migration solo_timeline).
    const { error } = await this.client.rpc('log_session', {
      p_group_id: groupId,
      p_activity: activity,
      p_duration_min: durationMin ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async logSteps(groupId: string | null, steps: number): Promise<void> {
    const { error } = await this.client.rpc('log_steps', {
      p_group_id: groupId,
      p_steps: steps,
    });
    if (error) throw new Error(error.message);
  }

  async logMeal(groupId: string | null, meal: MealInput): Promise<void> {
    const { error } = await this.client.rpc('log_meal', {
      p_group_id: groupId,
      p_label: meal.label,
      p_moment: meal.moment ?? null,
      p_calories_kcal: meal.caloriesKcal ?? null,
      p_protein_g: meal.proteinG ?? null,
      p_carbs_g: meal.carbsG ?? null,
      p_fat_g: meal.fatG ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async logRest(groupId: string | null): Promise<void> {
    const { error } = await this.client.rpc('log_rest', { p_group_id: groupId });
    if (error) throw new Error(error.message);
  }

  async logSleep(groupId: string | null, hours: number): Promise<void> {
    const { error } = await this.client.rpc('log_sleep', { p_group_id: groupId, p_hours: hours });
    if (error) throw new Error(error.message);
  }

  async deletePost(feedItemId: string): Promise<void> {
    // La RLS (feed_items_delete) n'autorise que l'auteur ; le cascade nettoie les
    // détails (session/steps/meal), réactions et commentaires.
    const { error } = await this.client.from('feed_items').delete().eq('id', feedItemId);
    if (error) throw new Error(error.message);
  }
}
