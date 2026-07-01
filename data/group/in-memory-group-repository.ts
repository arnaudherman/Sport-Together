import type { Group, GroupMember } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/** Mock de GroupRepository (hors-ligne / tests). Garde les groupes en mémoire. */
export class InMemoryGroupRepository implements GroupRepository {
  // Pré-seedé avec des groupes de démo (solo-first : add-on). 'demo-group' porte
  // DEMO_FEED ; 'les-costauds' illustre l'appartenance à plusieurs cercles.
  // `demo-group` est créé par le faux-user (droits de gestion visibles en mock).
  private groups: Group[] = [
    { id: 'demo-group', name: 'The Crew', createdBy: 'local-user' },
    { id: 'les-costauds', name: 'Les Costauds', createdBy: 'u-noa' },
  ];
  private codes = new Map<string, string>([
    ['demo-group', 'CREW42'],
    ['les-costauds', 'COSTAUD1'],
  ]);

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
    this.groups.push({ id, name, createdBy: 'local-user' });
    this.codes.set(id, 'LOCAL000');
    return { id, name, inviteCode: 'LOCAL000', createdBy: 'local-user' };
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

  async getInvite(groupId: string): Promise<string> {
    const code = this.codes.get(groupId);
    if (!code) throw new Error('Code introuvable');
    return code;
  }

  async rotateInviteCode(groupId: string): Promise<string> {
    const fresh = `NEW${groupId.length}${this.codes.size}X`.toUpperCase();
    this.codes.set(groupId, fresh);
    return fresh;
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    this.groups = this.groups.map((g) => (g.id === groupId ? { ...g, name: name.trim() } : g));
  }

  async deleteGroup(groupId: string): Promise<void> {
    this.groups = this.groups.filter((g) => g.id !== groupId);
    this.codes.delete(groupId);
  }
}
