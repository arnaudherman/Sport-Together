import type { Group } from '@/domain/entities/group';

/**
 * Port des groupes (ADR-0004 / ADR-0007). Création et adhésion passent par les
 * RPC SECURITY DEFINER côté serveur (seuls chemins d'écriture sur memberships).
 */
export interface GroupRepository {
  createGroup(name: string): Promise<Group>;
  joinByCode(code: string): Promise<Group>;
}
