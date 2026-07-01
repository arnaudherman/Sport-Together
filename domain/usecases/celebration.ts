import { levelForXp } from '@/domain/usecases/gamification';
import { graphState, MUSCU_GRAPH } from '@/domain/usecases/skill-graph';

/** Progression capturée avant/après un log (XP total + paliers d'arbre débloqués). */
export interface ProgressSnapshot {
  xp: number;
  unlocked: number;
}

export type Celebration =
  | { kind: 'level'; level: number }
  | { kind: 'node'; label: string }
  | null;

/**
 * Décide s'il faut CÉLÉBRER après un log, en comparant l'état avant/après — logique
 * pure (le pic de récompense du core loop). Priorité au level-up (le plus fort), sinon
 * au palier d'arbre nouvellement franchi. Retourne `null` si rien de notable.
 */
export function celebrationFor(before: ProgressSnapshot, after: ProgressSnapshot): Celebration {
  const levelAfter = levelForXp(after.xp);
  if (levelAfter > levelForXp(before.xp)) return { kind: 'level', level: levelAfter };

  if (after.unlocked > before.unlocked) {
    const doneBefore = new Set(
      graphState(MUSCU_GRAPH, before.unlocked).nodes.filter((n) => n.state === 'done').map((n) => n.node.id),
    );
    const newly = graphState(MUSCU_GRAPH, after.unlocked).nodes.find(
      (n) => n.state === 'done' && !doneBefore.has(n.node.id),
    );
    if (newly) return { kind: 'node', label: newly.node.label };
  }
  return null;
}
