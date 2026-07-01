import type { FeedItem } from '@/domain/entities/feed';

/**
 * Arbre de compétences en HOLY GRAPH ramifié (ADR-0009) — logique pure. Les nœuds
 * portent une position (x,y) et des prérequis ; on débloque le long des branches.
 * v1 : un arbre (Corps), progression dérivée du nombre de séances loggées.
 */
export type NodeState = 'done' | 'available' | 'locked';

export interface GraphNode {
  id: string;
  label: string;
  xp: number;
  x: number;
  y: number;
  order: number;
  requires: string[];
}

export interface SkillGraph {
  name: string;
  width: number;
  height: number;
  nodes: GraphNode[];
}

export const MUSCU_GRAPH: SkillGraph = {
  name: 'Corps',
  width: 340,
  height: 540,
  nodes: [
    { id: 'base', label: 'Base', xp: 0, x: 170, y: 490, order: 0, requires: [] },
    { id: 'p5', label: '5 pompes', xp: 50, x: 80, y: 405, order: 1, requires: ['base'] },
    { id: 'gain', label: 'Gainage', xp: 60, x: 260, y: 405, order: 2, requires: ['base'] },
    { id: 'p20', label: '20 pompes', xp: 80, x: 72, y: 310, order: 3, requires: ['p5'] },
    { id: 'plank', label: 'Gainage 90s', xp: 90, x: 176, y: 305, order: 4, requires: ['gain'] },
    { id: 't1', label: '1re traction', xp: 120, x: 290, y: 310, order: 5, requires: ['gain'] },
    { id: 't10', label: '10 tractions', xp: 150, x: 290, y: 210, order: 6, requires: ['t1'] },
    { id: 'dc', label: 'Dév. 1×PDC', xp: 250, x: 158, y: 200, order: 7, requires: ['p20', 'plank'] },
    { id: 'p50', label: '50 pompes', xp: 180, x: 62, y: 208, order: 8, requires: ['p20'] },
    { id: 't15', label: '15 tractions', xp: 200, x: 290, y: 115, order: 9, requires: ['t10'] },
    { id: 'mu', label: 'Muscle-up', xp: 400, x: 284, y: 48, order: 10, requires: ['t15'] },
  ],
};

export interface GraphEdge {
  from: string;
  to: string;
  active: boolean;
}

export interface GraphState {
  nodes: { node: GraphNode; state: NodeState }[];
  edges: GraphEdge[];
}

/** Nombre de paliers débloqués = séances loggées par l'utilisateur (plafonné). */
export function sessionsUnlocked(items: readonly FeedItem[], userId: string): number {
  let count = 0;
  for (const it of items) if (it.authorId === userId && it.type === 'session') count += 1;
  return Math.min(count, MUSCU_GRAPH.nodes.length);
}

/** États des nœuds + arêtes pour un nombre de paliers débloqués (ordre topologique). */
export function graphState(graph: SkillGraph, unlocked: number): GraphState {
  const isDone = (n: GraphNode): boolean => n.order < unlocked;
  const nodes = graph.nodes.map((node) => {
    let state: NodeState;
    if (isDone(node)) state = 'done';
    else if (node.requires.every((rid) => {
      const req = graph.nodes.find((r) => r.id === rid);
      return req ? isDone(req) : true;
    })) state = 'available';
    else state = 'locked';
    return { node, state };
  });
  const edges: GraphEdge[] = [];
  for (const node of graph.nodes) {
    for (const rid of node.requires) {
      const req = graph.nodes.find((r) => r.id === rid);
      edges.push({ from: rid, to: node.id, active: req ? isDone(req) : false });
    }
  }
  return { nodes, edges };
}
