import type { FeedItem, FeedItemType } from '@/domain/entities/feed';
import { capRestDays, localDayKey, loggedDaysFor, previousDayKey, restDaysFor, satisfiedDays } from '@/domain/usecases/streak';

/**
 * Moteur de gamification v2 (docs/GAMIFICATION.md) — logique pure, testable.
 * Progression PERSONNELLE, et surtout PAS TROP FACILE :
 *
 *  - XP de base par type ;
 *  - RENDEMENTS DÉCROISSANTS par type et par jour local : 1er post d'un type =
 *    100 %, 2e = 50 %, 3e = 20 %, ensuite 0 — spammer ne rapporte rien ;
 *  - PLAFOND QUOTIDIEN de base (DAILY_CAP) ;
 *  - BONUS VARIÉTÉ : ≥ 3 types différents dans la journée = petit bonus fixe
 *    (pousse à l'équilibre de vie, pas au volume) ;
 *  - BONUS RÉGULARITÉ : la journée rapporte +10 % à partir de 7 jours de série,
 *    +20 % à partir de 30 (le jour de repos entretient la série, cf. streak).
 *
 * L'engine attribue l'XP PAR POST (byItem) pour que l'UI affiche le gain réel.
 */
const XP_BY_TYPE: Record<FeedItemType, number> = {
  session: 50,
  steps: 30,
  meal: 20,
  rest: 10, // la récup fait partie de la progression (vision §8, jamais punitif)
  sleep: 20, // bien dormir est un goal de qualité de vie à part entière
};

/** Décroissance du n-ième post d'un MÊME type dans la MÊME journée. */
const REPEAT_MULTIPLIERS = [1, 0.5, 0.2];
export const DAILY_CAP = 120; // plafond d'XP de base par jour (avant bonus)
export const VARIETY_BONUS = 15; // ≥ 3 types distincts dans la journée
const STREAK_BONUS_7 = 0.1;
const STREAK_BONUS_30 = 0.2;

/** XP de base (« jusqu'à ») d'un type — l'engine applique ensuite les règles. */
export function xpForType(type: FeedItemType): number {
  return XP_BY_TYPE[type];
}

export interface XpBreakdown {
  total: number;
  /** XP réellement gagné par post (après décroissance / plafond / bonus du jour). */
  byItem: Map<string, number>;
  /** XP gagné par jour local `YYYY-MM-DD` — alimente les graphiques de tendance. */
  byDay: Map<string, number>;
}

/**
 * Calcule l'XP d'un utilisateur depuis son feed, avec attribution par post.
 * Déterministe : itère les jours chronologiquement (la série se construit au fil
 * des jours, repos compris) puis applique décroissance → plafond → bonus.
 */
export function xpBreakdown(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes = 0,
): XpBreakdown {
  const mine = items
    .filter((it) => it.authorId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const byDay = new Map<string, FeedItem[]>();
  for (const it of mine) {
    const key = localDayKey(it.createdAt, tzOffsetMinutes);
    const list = byDay.get(key) ?? [];
    list.push(it);
    byDay.set(key, list);
  }

  const byItem = new Map<string, number>();
  const byDayXp = new Map<string, number>();
  let total = 0;

  // Série pour le BONUS : mêmes primitives que le streak affiché — jours loggés
  // OU repos BORNÉ (2/7 glissants). Poster uniquement des repos ne construit pas
  // de bonus à vie (cohérence affichage <-> calcul, anti-farm).
  const satisfied = satisfiedDays(
    loggedDaysFor(mine, userId, tzOffsetMinutes),
    capRestDays(restDaysFor(mine, userId, tzOffsetMinutes)),
  );
  const streakAt = (day: string): number => {
    let len = 0;
    let cursor = day;
    while (satisfied.has(cursor)) {
      len += 1;
      cursor = previousDayKey(cursor);
    }
    return len;
  };

  const days = [...byDay.keys()].sort();
  for (const day of days) {
    const streak = streakAt(day);

    const posts = byDay.get(day) ?? [];
    const seenOfType = new Map<FeedItemType, number>();
    const raw: { id: string; xp: number }[] = [];
    for (const post of posts) {
      const nth = seenOfType.get(post.type) ?? 0;
      seenOfType.set(post.type, nth + 1);
      const mult = REPEAT_MULTIPLIERS[nth] ?? 0;
      raw.push({ id: post.id, xp: XP_BY_TYPE[post.type] * mult });
    }

    // Plafond quotidien : on tronque dans l'ordre chronologique.
    let budget = DAILY_CAP;
    for (const entry of raw) {
      const granted = Math.min(entry.xp, budget);
      budget -= granted;
      entry.xp = granted;
    }

    let dayTotal = raw.reduce((sum, entry) => sum + entry.xp, 0);

    // Bonus variété (≥ 3 types distincts) — attribué au dernier post du jour.
    if (seenOfType.size >= 3 && raw.length > 0) {
      raw[raw.length - 1].xp += VARIETY_BONUS;
      dayTotal += VARIETY_BONUS;
    }

    // Bonus régularité : multiplicateur du jour selon la série courante.
    const streakMult = streak >= 30 ? 1 + STREAK_BONUS_30 : streak >= 7 ? 1 + STREAK_BONUS_7 : 1;
    if (streakMult > 1 && dayTotal > 0) {
      const factor = streakMult;
      dayTotal = 0;
      for (const entry of raw) {
        entry.xp = Math.round(entry.xp * factor);
        dayTotal += entry.xp;
      }
    } else {
      for (const entry of raw) entry.xp = Math.round(entry.xp);
      dayTotal = raw.reduce((sum, entry) => sum + entry.xp, 0);
    }

    for (const entry of raw) byItem.set(entry.id, entry.xp);
    byDayXp.set(day, dayTotal);
    total += dayTotal;
  }

  return { total, byItem, byDay: byDayXp };
}

/** XP cumulé d'un utilisateur à partir de son feed (moteur v2). */
export function xpFromFeed(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes = 0,
): number {
  return xpBreakdown(items, userId, tzOffsetMinutes).total;
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
