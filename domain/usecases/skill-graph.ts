import type { FeedItem } from '@/domain/entities/feed';
import { localDayKey } from '@/domain/usecases/streak';

/**
 * Arbre de compétences en HOLY GRAPH ramifié (ADR-0009) — logique pure. Les nœuds
 * portent une position (x,y) et des prérequis ; on débloque VRAIMENT le long des
 * branches (propagation topologique respectant `requires`, pas un compteur linéaire).
 * v1 : un arbre (Corps), progression = jours d'entraînement distincts (non farmable).
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

/**
 * Nombre de paliers débloqués = JOURS d'entraînement distincts de l'utilisateur
 * (plafonné). Dédupliqué par jour local pour ne pas rendre l'arbre farmable (logger
 * 11 séances la même minute ne débloque qu'un palier). Cohérent avec le moteur streak.
 */
export function sessionsUnlocked(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes = 0,
): number {
  const days = new Set<string>();
  for (const it of items) {
    if (it.authorId === userId && it.type === 'session') days.add(localDayKey(it.createdAt, tzOffsetMinutes));
  }
  return Math.min(days.size, MUSCU_GRAPH.nodes.length);
}

/**
 * Ensemble des nœuds « done » : on dépense `budget` paliers en propagation sur le DAG,
 * en ne débloquant qu'un nœud dont TOUS les `requires` sont déjà done (l'`order` ne sert
 * qu'à départager les débloquables simultanés). Robuste aux prérequis multiples et à un
 * `order` non topologique — contrairement à l'ancien `order < unlocked`.
 */
function computeDone(graph: SkillGraph, budget: number): Set<string> {
  const done = new Set<string>();
  let remaining = Math.min(budget, graph.nodes.length);
  while (remaining > 0) {
    const frontier = graph.nodes
      .filter((n) => !done.has(n.id) && n.requires.every((rid) => done.has(rid)))
      .sort((a, b) => a.order - b.order);
    if (frontier.length === 0) break; // DAG bloqué (prérequis manquant/cycle)
    done.add(frontier[0].id);
    remaining -= 1;
  }
  return done;
}

/** États des nœuds + arêtes pour un nombre de paliers débloqués (le long du DAG). */
export function graphState(graph: SkillGraph, unlocked: number): GraphState {
  const done = computeDone(graph, unlocked);
  const nodes = graph.nodes.map((node) => {
    let state: NodeState;
    if (done.has(node.id)) state = 'done';
    else if (node.requires.every((rid) => done.has(rid))) state = 'available';
    else state = 'locked';
    return { node, state };
  });
  const edges: GraphEdge[] = [];
  for (const node of graph.nodes) {
    for (const rid of node.requires) {
      edges.push({ from: rid, to: node.id, active: done.has(rid) });
    }
  }
  return { nodes, edges };
}
