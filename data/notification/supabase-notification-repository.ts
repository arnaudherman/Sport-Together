import type { SupabaseClient } from '@supabase/supabase-js';

import type { NotificationRepository } from '@/domain/repositories/notification-repository';

/**
 * Implémentation Supabase du NotificationRepository (ADR-0006). Les tokens sont
 * stockés dans device_tokens (RLS : chacun ne gère que les siens) ; la relance
 * passe par l'Edge Function `nudge` (vérification d'appartenance côté serveur).
 * data/ est la seule couche autorisée à importer le SDK Supabase (ADR-0007).
 */
export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async uid(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async registerToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    const id = await this.uid();
    if (!id) throw new Error('Non authentifié');
    const { error } = await this.client.from('device_tokens').upsert({
      user_id: id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  async removeToken(token: string): Promise<void> {
    const id = await this.uid();
    if (!id) return;
    await this.client.from('device_tokens').delete().eq('user_id', id).eq('token', token);
  }

  async nudge(targetUserId: string, groupId: string): Promise<void> {
    const { error } = await this.client.functions.invoke('nudge', {
      body: { target_user_id: targetUserId, group_id: groupId },
    });
    if (error) throw new Error(error.message);
  }
}
