import type { FeedItem } from '@/domain/entities/feed';

/**
 * Arbres de compétences (ADR-0009) — logique pure. Progression PERSONNELLE : on
 * débloque des paliers concrets, contre soi-même et la carte (pas de classement).
 * v1 : un seul arbre (Muscu), progression linéaire dérivée du nombre de séances.
 */
export type SkillState = 'done' | 'available' | 'locked';

export interface SkillNode {
  id: string;
  label: string;
  detail: string;
  xp: number;
}

export interface SkillTree {
  id: string;
  name: string;
  domain: string;
  nodes: SkillNode[];
}

export const MUSCU_TREE: SkillTree = {
  id: 'muscu',
  name: 'Corps · Muscu',
  domain: 'Corps',
  nodes: [
    { id: 'pompes-5', label: '5 pompes', detail: 'Le premier pas.', xp: 50 },
    { id: 'pompes-20', label: "20 pompes d'affilée", detail: 'Endurance de base.', xp: 80 },
    { id: 'gainage-1', label: 'Gainage 1 min', detail: 'Le socle.', xp: 80 },
    { id: 'traction-1', label: '1ʳᵉ traction stricte', detail: 'Un cap symbolique.', xp: 120 },
    { id: 'traction-10', label: '10 tractions', detail: 'Tu tires fort.', xp: 150 },
    { id: 'traction-15', label: '15 tractions', detail: 'Niveau costaud.', xp: 180 },
    { id: 'dc-bodyweight', label: 'Développé couché à 1× PDC', detail: 'Force pure.', xp: 250 },
  ],
};

/** Nombre de paliers débloqués, dérivé du nombre de séances loggées (mock v1). */
export function unlockedFromFeed(items: readonly FeedItem[], userId: string): number {
  let count = 0;
  for (const it of items) {
    if (it.authorId === userId && it.type === 'session') count += 1;
  }
  return Math.min(count, MUSCU_TREE.nodes.length);
}

/** État de chaque nœud pour un nombre de paliers débloqués. */
export function nodeStates(
  tree: SkillTree,
  unlockedCount: number,
): { node: SkillNode; state: SkillState }[] {
  return tree.nodes.map((node, i) => ({
    node,
    state: i < unlockedCount ? 'done' : i === unlockedCount ? 'available' : 'locked',
  }));
}
