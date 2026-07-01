import type { SupabaseClient } from '@supabase/supabase-js';

import type { FollowRepository } from '@/domain/repositories/follow-repository';

/**
 * Implémentation Supabase des abonnements (ADR-0010). Table `follows`
 * (follower_id, followee_id), RLS : chacun ne gère que ses propres abonnements.
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseFollowRepository implements FollowRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async uid(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Non authentifié');
    return id;
  }

  async listFollowing(): Promise<string[]> {
    const me = await this.uid();
    const { data, error } = await this.client
      .from('follows')
      .select('followee_id')
      .eq('follower_id', me);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { followee_id: string }[]).map((r) => r.followee_id);
  }

  async listFollowers(): Promise<string[]> {
    // Autorisé par follows_select (followee_id = auth.uid()) — « qui me suit ».
    const me = await this.uid();
    const { data, error } = await this.client
      .from('follows')
      .select('follower_id')
      .eq('followee_id', me);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { follower_id: string }[]).map((r) => r.follower_id);
  }

  async isFollowing(userId: string): Promise<boolean> {
    const me = await this.uid();
    const { data, error } = await this.client
      .from('follows')
      .select('followee_id')
      .eq('follower_id', me)
      .eq('followee_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data != null;
  }

  async follow(userId: string): Promise<void> {
    const me = await this.uid();
    const { error } = await this.client
      .from('follows')
      .upsert({ follower_id: me, followee_id: userId });
    if (error) throw new Error(error.message);
  }

  async unfollow(userId: string): Promise<void> {
    const me = await this.uid();
    const { error } = await this.client
      .from('follows')
      .delete()
      .eq('follower_id', me)
      .eq('followee_id', userId);
    if (error) throw new Error(error.message);
  }
}
