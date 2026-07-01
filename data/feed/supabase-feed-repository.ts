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
  group: OneOrMany<{ name: string }>;
  comment_count: { count: number }[] | null;
  sessions: OneOrMany<{ activity: string; duration_min: number | null }>;
  step_logs: OneOrMany<{ steps: number }>;
  meals: OneOrMany<{ label: string; calories_kcal: number | null }>;
  reactions: { kind: ReactionKind; author_id: string | null }[] | null;
}

const FEED_SELECT =
  'id, group_id, author_id, type, created_at, ' +
  'author:profiles(pseudo), group:groups(name), comment_count:comments(count), ' +
  'sessions(activity, duration_min), step_logs(steps), ' +
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
    groupId: row.group_id,
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

  async listHomeFeed(): Promise<FeedItem[]> {
    // Pas de filtre groupe : la RLS ne renvoie que les entrées visibles par
    // l'utilisateur (ses groupes ; abonnements à venir). Solo-first.
    const viewerId = await this.viewerId();
    const { data, error } = await this.client
      .from('feed_items')
      .select(FEED_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as FeedRow[]).map((row) => mapRow(row, viewerId));
  }

  async listGroupFeed(groupId: string): Promise<FeedItem[]> {
    const viewerId = await this.viewerId();
    const { data, error } = await this.client
      .from('feed_items')
      .select(FEED_SELECT)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as FeedRow[]).map((row) => mapRow(row, viewerId));
  }

  async listUserFeed(userId: string): Promise<FeedItem[]> {
    // Posts d'un utilisateur (pour son profil) ; la RLS filtre à ce qui est visible.
    const viewerId = await this.viewerId();
    const { data, error } = await this.client
      .from('feed_items')
      .select(FEED_SELECT)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as FeedRow[]).map((row) => mapRow(row, viewerId));
  }

  // Publier en solo (group_id null) exige une timeline perso côté backend (backlog).
  private requireGroup(groupId: string | null): string {
    if (groupId === null) {
      throw new Error("Publier en solo arrive bientôt — rejoins un groupe pour l'instant.");
    }
    return groupId;
  }

  async logSession(groupId: string | null, activity: string, durationMin?: number): Promise<void> {
    const { error } = await this.client.rpc('log_session', {
      p_group_id: this.requireGroup(groupId),
      p_activity: activity,
      p_duration_min: durationMin ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async logSteps(groupId: string | null, steps: number): Promise<void> {
    const { error } = await this.client.rpc('log_steps', {
      p_group_id: this.requireGroup(groupId),
      p_steps: steps,
    });
    if (error) throw new Error(error.message);
  }

  async logMeal(groupId: string | null, meal: MealInput): Promise<void> {
    const { error } = await this.client.rpc('log_meal', {
      p_group_id: this.requireGroup(groupId),
      p_label: meal.label,
      p_moment: meal.moment ?? null,
      p_calories_kcal: meal.caloriesKcal ?? null,
      p_protein_g: meal.proteinG ?? null,
      p_carbs_g: meal.carbsG ?? null,
      p_fat_g: meal.fatG ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async deletePost(feedItemId: string): Promise<void> {
    // La RLS (feed_items_delete) n'autorise que l'auteur ; le cascade nettoie les
    // détails (session/steps/meal), réactions et commentaires.
    const { error } = await this.client.from('feed_items').delete().eq('id', feedItemId);
    if (error) throw new Error(error.message);
  }
}
