import { levelForXp } from '@/domain/usecases/gamification';
import { LIFE_DOMAINS } from '@/domain/usecases/life-domains';

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
    // Paliers du domaine Sport (arbre de vie) : on célèbre le plus haut franchi.
    const sport = LIFE_DOMAINS.find((d) => d.key === 'sport');
    const crossed = (sport?.milestones ?? []).filter(
      (m) => after.unlocked >= m.target && before.unlocked < m.target,
    );
    const top = crossed[crossed.length - 1];
    if (top) return { kind: 'node', label: top.label };
  }
  return null;
}
