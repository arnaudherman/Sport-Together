import type { FeedItem } from '@/domain/entities/feed';
import { levelForXp, xpFromFeed } from '@/domain/usecases/gamification';
import { LIFE_DOMAINS, lifeProgress } from '@/domain/usecases/life-domains';

/**
 * Progression capturée avant/après un log : XP total + paliers atteints PAR
 * domaine de vie (non plafonné — corrige la célébration qui mourait à 11 jours
 * quand elle comparait l'ancien arbre plafonné aux paliers de l'arbre de vie).
 */
export interface ProgressSnapshot {
  xp: number;
  doneByDomain: Record<string, number>;
}

export type Celebration =
  | { kind: 'level'; level: number }
  | { kind: 'node'; label: string }
  | null;

/** Construit un snapshot de progression depuis le feed (pur). */
export function progressSnapshot(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes = 0,
): ProgressSnapshot {
  const doneByDomain: Record<string, number> = {};
  for (const d of lifeProgress(items, userId, tzOffsetMinutes)) {
    doneByDomain[d.def.key] = d.done;
  }
  return { xp: xpFromFeed(items, userId, tzOffsetMinutes), doneByDomain };
}

/**
 * Décide s'il faut CÉLÉBRER après un log — logique pure (le pic de récompense du
 * core loop). Priorité au level-up, sinon au premier palier de domaine franchi.
 */
export function celebrationFor(before: ProgressSnapshot, after: ProgressSnapshot): Celebration {
  const levelAfter = levelForXp(after.xp);
  if (levelAfter > levelForXp(before.xp)) return { kind: 'level', level: levelAfter };

  for (const d of LIFE_DOMAINS) {
    const beforeDone = before.doneByDomain[d.key] ?? 0;
    const afterDone = after.doneByDomain[d.key] ?? 0;
    if (afterDone > beforeDone) {
      const milestone = d.milestones[afterDone - 1];
      if (milestone) return { kind: 'node', label: milestone.label };
    }
  }
  return null;
}
