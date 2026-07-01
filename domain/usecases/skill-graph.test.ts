import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { graphState, MUSCU_GRAPH, sessionsUnlocked, type SkillGraph } from '@/domain/usecases/skill-graph';

function session(id: string, authorId: string, day = '01'): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type: 'session', createdAt: `2026-07-${day}T08:00:00.000Z`, summary: 's' };
}

describe('skill-graph', () => {
  it("compte les JOURS d'entraînement distincts, pas les posts (non farmable)", () => {
    const sameDay = [session('a', 'u1', '01'), session('b', 'u1', '01'), session('c', 'u1', '01')];
    expect(sessionsUnlocked(sameDay, 'u1')).toBe(1); // 3 séances le même jour -> 1 palier
    const threeDays = [session('a', 'u1', '01'), session('b', 'u1', '02'), session('c', 'u1', '03')];
    expect(sessionsUnlocked(threeDays, 'u1')).toBe(3);
  });

  it("ne compte que les séances de l'utilisateur", () => {
    const items = [session('a', 'u1', '01'), session('b', 'u2', '02')];
    expect(sessionsUnlocked(items, 'u1')).toBe(1);
    expect(sessionsUnlocked(items, 'u2')).toBe(1);
  });

  it('dérive done / available / locked le long des branches', () => {
    const { nodes } = graphState(MUSCU_GRAPH, 3); // base, p5, gain débloqués
    const state = (id: string) => nodes.find((n) => n.node.id === id)?.state;
    expect(state('base')).toBe('done');
    expect(state('p5')).toBe('done');
    expect(state('gain')).toBe('done');
    expect(state('p20')).toBe('available'); // requires p5 (done)
    expect(state('plank')).toBe('available'); // requires gain (done)
    expect(state('t1')).toBe('available'); // requires gain (done)
    expect(state('t10')).toBe('locked'); // requires t1 (pas done)
    expect(state('mu')).toBe('locked');
  });

  it('respecte les prérequis MULTIPLES (dc requires p20 ET plank)', () => {
    const doneIds = (u: number) => new Set(graphState(MUSCU_GRAPH, u).nodes.filter((n) => n.state === 'done').map((n) => n.node.id));
    // Plus petit budget où p20 est done mais plank ne l'est pas encore.
    let u = 0;
    while (u <= MUSCU_GRAPH.nodes.length && !(doneIds(u).has('p20') && !doneIds(u).has('plank'))) u += 1;
    const partial = graphState(MUSCU_GRAPH, u);
    const dc = partial.nodes.find((n) => n.node.id === 'dc');
    expect(dc?.state).not.toBe('done'); // un prérequis manque -> jamais 'done'
    expect(dc?.state).toBe('locked'); // p20 done mais plank non -> locked
    expect(partial.edges.find((e) => e.from === 'plank' && e.to === 'dc')?.active).toBe(false);
    // À budget max, tout est done.
    const full = graphState(MUSCU_GRAPH, MUSCU_GRAPH.nodes.length);
    expect(full.nodes.every((n) => n.state === 'done')).toBe(true);
  });

  it("ne rend jamais un nœud done si un prérequis ne l'est pas (order non topologique)", () => {
    // order contredit requires : A(order 0) requires B(order 1).
    const g: SkillGraph = {
      name: 'test',
      width: 100,
      height: 100,
      nodes: [
        { id: 'A', label: 'A', xp: 0, x: 0, y: 0, order: 0, requires: ['B'] },
        { id: 'B', label: 'B', xp: 0, x: 0, y: 0, order: 1, requires: [] },
      ],
    };
    const { nodes } = graphState(g, 1); // 1 palier : seul B est débloquable (A dépend de B)
    const state = (id: string) => nodes.find((n) => n.node.id === id)?.state;
    expect(state('B')).toBe('done');
    expect(state('A')).toBe('available'); // pas done malgré order 0 : B vient juste d'être fait
    expect(graphState(g, 2).nodes.every((n) => n.state === 'done')).toBe(true);
  });

  it('marque les arêtes actives quand la source est débloquée', () => {
    const { edges } = graphState(MUSCU_GRAPH, 3);
    expect(edges.find((e) => e.from === 'base' && e.to === 'p5')?.active).toBe(true);
    expect(edges.find((e) => e.from === 't1' && e.to === 't10')?.active).toBe(false);
  });
});
