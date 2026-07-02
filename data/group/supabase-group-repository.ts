import type { SupabaseClient } from '@supabase/supabase-js';

import type { Group, GroupMember, PublicGroup } from '@/domain/entities/group';
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
      .select('id, name, created_by, visibility')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; name: string; created_by: string | null; visibility: 'private' | 'public' }[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdBy: row.created_by ?? undefined,
      visibility: row.visibility,
    }));
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await this.client
      .from('memberships')
      .select('user_id, profiles(pseudo)')
      .eq('group_id', groupId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as {
      user_id: string;
      profiles: { pseudo: string } | { pseudo: string }[] | null;
    }[];
    return rows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return { id: row.user_id, pseudo: profile?.pseudo ?? 'Membre' };
    });
  }

  async createGroup(name: string, visibility: 'private' | 'public' = 'private'): Promise<Group> {
    // create_group renvoie la ligne groups complète (incl. invite_code à partager).
    const { data, error } = await this.client.rpc('create_group', {
      group_name: name.trim(),
      p_visibility: visibility,
    });
    if (error) throw new Error(error.message);
    const row = data as { id: string; name: string; invite_code: string };
    return { id: row.id, name: row.name, inviteCode: row.invite_code, visibility };
  }

  async leaveGroup(groupId: string): Promise<void> {
    // La RLS (memberships_delete: user_id = auth.uid()) borne à SA propre ligne.
    const { error } = await this.client.from('memberships').delete().eq('group_id', groupId);
    if (error) throw new Error(error.message);
  }

  async getInvite(groupId: string): Promise<string> {
    const { data, error } = await this.client.rpc('get_group_invite', { p_group_id: groupId });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as { code: string } | undefined;
    if (!row?.code) throw new Error('Code introuvable');
    return row.code;
  }

  async rotateInviteCode(groupId: string): Promise<string> {
    const { data, error } = await this.client.rpc('rotate_invite_code', { p_group_id: groupId });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    // La RLS (groups_update: created_by = auth.uid()) borne au créateur.
    const { error } = await this.client.from('groups').update({ name: name.trim() }).eq('id', groupId);
    if (error) throw new Error(error.message);
  }

  async deleteGroup(groupId: string): Promise<void> {
    // La RLS (groups_delete: created_by = auth.uid()) borne au créateur ; cascade en base.
    const { error } = await this.client.from('groups').delete().eq('id', groupId);
    if (error) throw new Error(error.message);
  }

  async listPublicGroups(query?: string): Promise<PublicGroup[]> {
    const { data, error } = await this.client.rpc('list_public_groups', { q: query ?? null });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; name: string; member_count: number }[];
    return rows.map((row) => ({ id: row.id, name: row.name, memberCount: Number(row.member_count) }));
  }

  async joinPublicGroup(groupId: string): Promise<Group> {
    const { data, error } = await this.client.rpc('join_public_group', { p_group_id: groupId });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { joined_id: string; joined_name: string }
      | undefined;
    if (!row) throw new Error('Groupe introuvable ou privé');
    return { id: row.joined_id, name: row.joined_name, visibility: 'public' };
  }

  async setVisibility(groupId: string, visibility: 'private' | 'public'): Promise<void> {
    // La RLS (groups_update: created_by = auth.uid()) borne au créateur.
    const { error } = await this.client.from('groups').update({ visibility }).eq('id', groupId);
    if (error) throw new Error(error.message);
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
    // Réponse vide = code invalide OU expiré (message unique — pas d'oracle).
    if (!row) throw new Error("Code d'invitation invalide ou expiré");
    return { id: row.joined_id, name: row.joined_name };
  }
}
