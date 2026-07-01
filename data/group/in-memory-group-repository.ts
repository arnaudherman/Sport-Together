import type { Group, GroupMember } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/** Mock de GroupRepository (hors-ligne / tests). Garde les groupes en mémoire. */
export class InMemoryGroupRepository implements GroupRepository {
  // Pré-seedé avec des groupes de démo (solo-first : add-on). 'demo-group' porte
  // DEMO_FEED ; 'les-costauds' illustre l'appartenance à plusieurs cercles.
  private groups: Group[] = [
    { id: 'demo-group', name: 'The Crew' },
    { id: 'les-costauds', name: 'Les Costauds' },
  ];

  async listMyGroups(): Promise<Group[]> {
    return this.groups.map((g) => ({ id: g.id, name: g.name }));
  }

  async listMembers(_groupId: string): Promise<GroupMember[]> {
    // Membres de démo (les mêmes auteurs que DEMO_FEED) + toi.
    return [
      { id: 'local-user', pseudo: 'Moi' },
      { id: 'u-lea', pseudo: 'Léa' },
      { id: 'u-sam', pseudo: 'Sam' },
      { id: 'u-noa', pseudo: 'Noa' },
    ];
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

  async leaveGroup(groupId: string): Promise<void> {
    this.groups = this.groups.filter((g) => g.id !== groupId);
  }
}
