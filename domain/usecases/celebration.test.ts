import { describe, expect, it } from '@jest/globals';

import { celebrationFor, progressSnapshot, type ProgressSnapshot } from '@/domain/usecases/celebration';
import { xpForLevel } from '@/domain/usecases/gamification';
import type { FeedItem } from '@/domain/entities/feed';

function snap(xp: number, doneByDomain: Record<string, number> = {}): ProgressSnapshot {
  return { xp, doneByDomain };
}

function session(id: string, day: string): FeedItem {
  return { id, groupId: 'g', authorId: 'u1', authorName: 'u1', type: 'session', createdAt: `2026-07-${day}T08:00:00.000Z`, summary: 's' };
}

describe('celebrationFor (par domaine de vie)', () => {
  it('célèbre un passage de niveau en priorité', () => {
    const res = celebrationFor(snap(xpForLevel(1), { sport: 0 }), snap(xpForLevel(3), { sport: 1 }));
    expect(res?.kind).toBe('level');
  });

  it("célèbre un palier de domaine franchi (sans level-up)", () => {
    const xp = xpForLevel(2);
    const res = celebrationFor(snap(xp, { sport: 0 }), snap(xp, { sport: 1 }));
    expect(res).toEqual({ kind: 'node', label: 'Première séance' });
  });

  it('NE MEURT PLUS après 11 jours : le palier 15 jours se célèbre (bug du plafond corrigé)', () => {
    const xp = xpForLevel(2);
    const res = celebrationFor(snap(xp, { sport: 3 }), snap(xp, { sport: 4 }));
    expect(res).toEqual({ kind: 'node', label: 'Le pli est pris' }); // 4e palier sport = 15 jours
  });

  it('célèbre aussi les autres domaines (sommeil)', () => {
    const xp = xpForLevel(2);
    const res = celebrationFor(snap(xp, { sleep: 0 }), snap(xp, { sleep: 1 }));
    expect(res).toEqual({ kind: 'node', label: 'Première nuit suivie' });
  });

  it('ne célèbre rien si aucune progression notable', () => {
    const xp = xpForLevel(2);
    expect(celebrationFor(snap(xp, { sport: 3 }), snap(xp, { sport: 3 }))).toBeNull();
  });
});

describe('progressSnapshot', () => {
  it('capture xp + paliers par domaine depuis le feed', () => {
    const items = [session('a', '10'), session('b', '11'), session('c', '12')];
    const s = progressSnapshot(items, 'u1', 0);
    expect(s.doneByDomain.sport).toBe(2); // 3 jours -> paliers 1 et 3 atteints
    expect(s.xp).toBeGreaterThan(0);
  });
});
