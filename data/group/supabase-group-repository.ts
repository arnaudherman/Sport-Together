import type { SupabaseClient } from '@supabase/supabase-js';

import type { Group } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/**
 * Implémentation Supabase du GroupRepository (ADR-0004). Création/adhésion via
 * les RPC create_group / join_group_by_code (SECURITY DEFINER). La liste des
 * groupes est filtrée par la RLS (groups_select = is_group_member).
 */
export class SupabaseGroupRepository implements GroupRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMyGroups(): Promise<Group[]> {
    const { data, error } = await this.client
      .from('groups')
      .select('id, name')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; name: string }[];
    return rows.map((row) => ({ id: row.id, name: row.name }));
  }

  async createGroup(name: string): Promise<Group> {
    // create_group renvoie la ligne groups complète (incl. invite_code à partager).
    const { data, error } = await this.client.rpc('create_group', {
      group_name: name.trim(),
    });
    if (error) throw new Error(error.message);
    const row = data as { id: string; name: string; invite_code: string };
    return { id: row.id, name: row.name, inviteCode: row.invite_code };
  }

  async joinByCode(code: string): Promise<Group> {
    // join_group_by_code renvoie table(id, name) -> tableau (sans invite_code).
    const { data, error } = await this.client.rpc('join_group_by_code', {
      code: code.trim(),
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { joined_id: string; joined_name: string }
      | undefined;
    if (!row) throw new Error('Groupe introuvable');
    return { id: row.joined_id, name: row.joined_name };
  }
}
