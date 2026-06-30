import type { Group } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/** Mock de GroupRepository (hors-ligne / tests). Garde les groupes en mémoire. */
export class InMemoryGroupRepository implements GroupRepository {
  private readonly groups: Group[] = [];

  async listMyGroups(): Promise<Group[]> {
    return this.groups.map((g) => ({ id: g.id, name: g.name }));
  }

  async createGroup(name: string): Promise<Group> {
    const id = `local-group-${this.groups.length + 1}`;
    this.groups.push({ id, name });
    return { id, name, inviteCode: 'LOCAL000' };
  }

  async joinByCode(code: string): Promise<Group> {
    const id = `local-group-${code}`;
    if (!this.groups.some((g) => g.id === id)) {
      this.groups.push({ id, name: `Groupe ${code}` });
    }
    return { id, name: `Groupe ${code}` };
  }
}
