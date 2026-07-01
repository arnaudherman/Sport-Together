import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { filterFeed } from '@/ui/feed-filter';

function post(id: string, authorId: string, groupName?: string): FeedItem {
  return { id, groupId: groupName ? 'g' : 'solo', authorId, authorName: authorId, type: 'session', createdAt: '2026-07-01T08:00:00.000Z', summary: 's', groupName };
}

const me = 'me';
const items: FeedItem[] = [
  post('p-me-solo', me), // mon post solo (pas de groupe)
  post('p-me-grp', me, 'The Crew'), // mon post de groupe
  post('p-lea', 'u-lea', 'The Crew'), // suivi + groupe
  post('p-sam', 'u-sam'), // suivi, solo
  post('p-noa', 'u-noa'), // NON suivi
];
const following = ['u-lea', 'u-sam'];

describe('filterFeed', () => {
  it("'tout' renvoie tout le fil", () => {
    expect(filterFeed(items, 'tout', me, following).map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  it("'abonnements' = mes posts + les suivis, exclut les non-suivis", () => {
    const ids = filterFeed(items, 'abonnements', me, following).map((i) => i.id);
    expect(ids).toContain('p-me-solo'); // mes posts inclus (même solo)
    expect(ids).toContain('p-me-grp');
    expect(ids).toContain('p-lea');
    expect(ids).toContain('p-sam');
    expect(ids).not.toContain('p-noa'); // non suivi -> exclu
  });

  it("'groupes' ne garde que les posts avec groupName (exclut solo et abonnements sans groupe)", () => {
    const ids = filterFeed(items, 'groupes', me, following).map((i) => i.id);
    expect(ids).toEqual(['p-me-grp', 'p-lea']);
    expect(ids).not.toContain('p-me-solo'); // mon post solo n'est pas un post de groupe
    expect(ids).not.toContain('p-sam');
  });

  it("un de mes posts solo apparaît en Abonnements mais PAS en Groupes", () => {
    expect(filterFeed(items, 'abonnements', me, following).some((i) => i.id === 'p-me-solo')).toBe(true);
    expect(filterFeed(items, 'groupes', me, following).some((i) => i.id === 'p-me-solo')).toBe(false);
  });

  it('exclut les auteurs bloqués de TOUS les onglets (même suivis)', () => {
    const blocked = ['u-lea'];
    expect(filterFeed(items, 'tout', me, following, blocked).some((i) => i.authorId === 'u-lea')).toBe(false);
    expect(filterFeed(items, 'abonnements', me, following, blocked).some((i) => i.authorId === 'u-lea')).toBe(false);
    expect(filterFeed(items, 'groupes', me, following, blocked).some((i) => i.authorId === 'u-lea')).toBe(false);
    // les autres restent visibles
    expect(filterFeed(items, 'tout', me, following, blocked).some((i) => i.authorId === 'u-sam')).toBe(true);
  });
});
