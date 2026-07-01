import type { Group, GroupMember } from '@/domain/entities/group';

/**
 * Port des groupes (ADR-0004 / ADR-0007). Création et adhésion passent par les
 * RPC SECURITY DEFINER côté serveur (seuls chemins d'écriture sur memberships).
 * La liste « mes groupes » et les membres sont filtrés par la RLS.
 */
export interface GroupRepository {
  listMyGroups(): Promise<Group[]>;
  listMembers(groupId: string): Promise<GroupMember[]>;
  createGroup(name: string): Promise<Group>;
  joinByCode(code: string): Promise<Group>;
}
