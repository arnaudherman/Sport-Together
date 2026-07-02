import type { Group, GroupMember, PublicGroup } from '@/domain/entities/group';
import type { GroupRepository } from '@/domain/repositories/group-repository';

/** Mock de GroupRepository (hors-ligne / tests). Garde les groupes en mémoire. */
export class InMemoryGroupRepository implements GroupRepository {
  // Pré-seedé avec des groupes de démo (solo-first : add-on). 'demo-group' porte
  // DEMO_FEED ; 'les-costauds' illustre l'appartenance à plusieurs cercles.
  // `demo-group` est créé par le faux-user (droits de gestion visibles en mock).
  private groups: Group[] = [
    { id: 'demo-group', name: 'The Crew', createdBy: 'local-user', visibility: 'private' },
    { id: 'les-costauds', name: 'Les Costauds', createdBy: 'u-noa', visibility: 'private' },
  ];
  // Annuaire public de démo (rejoignables sans code).
  private readonly publics: PublicGroup[] = [
    { id: 'pub-run-paris', name: 'Course à pied Paris 🏃', memberCount: 128 },
    { id: 'pub-muscu-debutants', name: 'Muscu débutant·es', memberCount: 86 },
    { id: 'pub-sommeil', name: 'Mieux dormir ensemble 🌙', memberCount: 41 },
  ];
  private codes = new Map<string, string>([
    ['demo-group', 'CREW42'],
    ['les-costauds', 'COSTAUD1'],
  ]);

  async listMyGroups(): Promise<Group[]> {
    return this.groups.map((g) => ({ ...g }));
  }

  async listMembers(_groupId: string): Promise<GroupMember[]> {
    // Membres de démo (les mêmes auteurs que DEMO_FEED) + toi.
    return [
      { id: 'local-user', pseudo: 'Moi' },
      { id: 'u-lea', pseudo: 'Léa', avatarUrl: 'https://i.pravatar.cc/96?img=47' },
      { id: 'u-sam', pseudo: 'Sam', avatarUrl: 'https://i.pravatar.cc/96?img=33' },
      { id: 'u-noa', pseudo: 'Noa', avatarUrl: 'https://i.pravatar.cc/96?img=68' },
    ];
  }

  async createGroup(name: string, visibility: 'private' | 'public' = 'private'): Promise<Group> {
    const id = `local-group-${this.groups.length + 1}`;
    this.groups.push({ id, name, createdBy: 'local-user', visibility });
    this.codes.set(id, 'LOCAL000');
    return { id, name, inviteCode: 'LOCAL000', createdBy: 'local-user', visibility };
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

  async listPublicGroups(query?: string): Promise<PublicGroup[]> {
    const q = (query ?? '').trim().toLowerCase();
    return this.publics.filter((g) => !q || g.name.toLowerCase().includes(q));
  }

  async joinPublicGroup(groupId: string): Promise<Group> {
    const pub = this.publics.find((g) => g.id === groupId);
    if (!pub) throw new Error('Groupe introuvable');
    if (!this.groups.some((g) => g.id === groupId)) {
      this.groups.push({ id: pub.id, name: pub.name, visibility: 'public' });
    }
    return { id: pub.id, name: pub.name, visibility: 'public' };
  }

  async setVisibility(groupId: string, visibility: 'private' | 'public'): Promise<void> {
    this.groups = this.groups.map((g) => (g.id === groupId ? { ...g, visibility } : g));
  }
}
