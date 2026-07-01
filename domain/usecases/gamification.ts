import type { FeedItem, FeedItemType } from '@/domain/entities/feed';

/**
 * Moteur de gamification (voir docs/GAMIFICATION.md) — logique pure, testable.
 * Progression PERSONNELLE : XP par goal loggé, niveaux sur une courbe quadratique
 * douce. Pas de classement compétitif ici (choix produit : progresser contre
 * soi-même, pas contre les autres).
 */
const XP_BY_TYPE: Record<FeedItemType, number> = {
  session: 50,
  steps: 30,
  meal: 20,
};

export function xpForType(type: FeedItemType): number {
  return XP_BY_TYPE[type];
}

/** XP cumulé d'un utilisateur à partir de son feed. */
export function xpFromFeed(items: readonly FeedItem[], userId: string): number {
  let xp = 0;
  for (const item of items) {
    if (item.authorId === userId) xp += xpForType(item.type);
  }
  return xp;
}

/** XP total requis pour ATTEINDRE un niveau (0, 50, 200, 450, 800…). */
export function xpForLevel(level: number): number {
  return 50 * level * level;
}

/** Niveau correspondant à un total d'XP. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50));
}

export interface LevelProgress {
  level: number;
  into: number;
  span: number;
  ratio: number;
}

/** Détail de progression dans le niveau courant (pour la barre d'XP). */
export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - current;
  const into = Math.max(0, xp - current);
  return { level, into, span, ratio: span > 0 ? Math.min(1, into / span) : 0 };
}
