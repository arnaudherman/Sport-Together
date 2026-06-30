import type { Group } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/**
 * Mock de GroupRepository pour le mode hors-ligne / les tests. Aucune dépendance
 * externe (ADR-0007).
 */
export class InMemoryGroupRepository implements GroupRepository {
  private count = 0;

  async createGroup(name: string): Promise<Group> {
    this.count += 1;
    return { id: `local-group-${this.count}`, name, inviteCode: 'LOCAL000' };
  }

  async joinByCode(code: string): Promise<Group> {
    return { id: `local-group-${code}`, name: `Groupe ${code}` };
  }
}
