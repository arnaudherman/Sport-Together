import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { graphState, MUSCU_GRAPH, sessionsUnlocked } from '@/domain/usecases/skill-graph';

function session(id: string, authorId: string): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type: 'session', createdAt: '2026-07-01T08:00:00.000Z', summary: 's' };
}

describe('skill-graph', () => {
  it('compte les séances comme paliers débloqués (plafonné)', () => {
    const items = [session('a', 'u1'), session('b', 'u1'), session('c', 'u2')];
    expect(sessionsUnlocked(items, 'u1')).toBe(2);
    expect(sessionsUnlocked(items, 'u2')).toBe(1);
  });

  it('dérive done / available / locked le long des branches', () => {
    const { nodes } = graphState(MUSCU_GRAPH, 3); // base, p5, gain débloqués
    const state = (id: string) => nodes.find((n) => n.node.id === id)?.state;
    expect(state('base')).toBe('done');
    expect(state('p5')).toBe('done');
    expect(state('gain')).toBe('done');
    // frontière : prérequis satisfaits
    expect(state('p20')).toBe('available'); // requires p5 (done)
    expect(state('plank')).toBe('available'); // requires gain (done)
    expect(state('t1')).toBe('available'); // requires gain (done)
    // plus loin : verrouillé
    expect(state('t10')).toBe('locked'); // requires t1 (pas done)
    expect(state('mu')).toBe('locked');
  });

  it('marque les arêtes actives quand la source est débloquée', () => {
    const { edges } = graphState(MUSCU_GRAPH, 3);
    expect(edges.find((e) => e.from === 'base' && e.to === 'p5')?.active).toBe(true);
    expect(edges.find((e) => e.from === 't1' && e.to === 't10')?.active).toBe(false);
  });
});
