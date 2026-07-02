import type { Group, GroupMember, PublicGroup } from '@/domain/entities/group';

/**
 * Port des groupes (ADR-0004 / ADR-0007). Création et adhésion passent par les
 * RPC SECURITY DEFINER côté serveur (seuls chemins d'écriture sur memberships).
 * La liste « mes groupes » et les membres sont filtrés par la RLS.
 */
export interface GroupRepository {
  listMyGroups(): Promise<Group[]>;
  listMembers(groupId: string): Promise<GroupMember[]>;
  createGroup(name: string, visibility?: 'private' | 'public'): Promise<Group>;
  joinByCode(code: string): Promise<Group>;
  /** Quitter un groupe (supprime SA propre appartenance — politique memberships_delete). */
  leaveGroup(groupId: string): Promise<void>;
  /** Code d'invitation courant (membres seulement — RPC get_group_invite). */
  getInvite(groupId: string): Promise<string>;
  /** Régénère le code d'invitation (créateur seulement) et le renvoie. */
  rotateInviteCode(groupId: string): Promise<string>;
  /** Renomme le groupe (créateur seulement — RLS groups_update). */
  renameGroup(groupId: string, name: string): Promise<void>;
  /** Supprime le groupe (créateur seulement — RLS groups_delete, cascade). */
  deleteGroup(groupId: string): Promise<void>;
  /** Annuaire des groupes PUBLICS (nom + nb de membres), filtrable par nom. */
  listPublicGroups(query?: string): Promise<PublicGroup[]>;
  /** Rejoint un groupe public sans code (rate-limité côté serveur). */
  joinPublicGroup(groupId: string): Promise<Group>;
  /** Change la visibilité (créateur seulement — RLS groups_update). */
  setVisibility(groupId: string, visibility: 'private' | 'public'): Promise<void>;
}
