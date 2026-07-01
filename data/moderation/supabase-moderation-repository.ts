import type { SupabaseClient } from '@supabase/supabase-js';

import type { ModerationRepository, ReportKind } from '@/domain/repositories/moderation-repository';

/**
 * Implémentation Supabase de la modération (tables `reports` write-only +
 * `blocks` self-only). data/ est la seule couche autorisée à importer le SDK.
 */
export class SupabaseModerationRepository implements ModerationRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async uid(): Promise<string> {
    const { data } = await this.client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Non authentifié');
    return id;
  }

  async report(kind: ReportKind, targetId: string, reason: string): Promise<void> {
    const { error } = await this.client.from('reports').insert({
      reporter_id: await this.uid(),
      target_kind: kind,
      target_id: targetId,
      reason: reason.trim(),
    });
    if (error) throw new Error(error.message);
  }

  async listBlocked(): Promise<string[]> {
    const { data, error } = await this.client.from('blocks').select('blocked_id');
    if (error) throw new Error(error.message);
    return ((data ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id);
  }

  async block(userId: string): Promise<void> {
    const { error } = await this.client
      .from('blocks')
      .upsert({ blocker_id: await this.uid(), blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  async unblock(userId: string): Promise<void> {
    const { error } = await this.client.from('blocks').delete().eq('blocked_id', userId);
    if (error) throw new Error(error.message);
  }
}
