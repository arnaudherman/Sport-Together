import type { FeedItem } from '@/domain/entities/feed';

/**
 * Moteur de streak (vision §3) — logique métier pure, testable sans backend.
 *
 * Principe NON PUNITIF (vision §8) :
 *  - le streak personnel est quotidien ; un jour est « satisfait » si l'utilisateur
 *    a loggé au moins un goal CE jour-là OU a posé un jour de repos ;
 *  - le streak compte les jours satisfaits consécutifs finissant aujourd'hui, ou
 *    hier si aujourd'hui n'est pas encore satisfait (on laisse la journée se finir,
 *    pas de rupture anxiogène en cours de journée) ;
 *  - la « journée parfaite » du groupe est un BONUS collectif (tous ont participé),
 *    jamais une casse collective.
 *
 * Les clés de jour sont des chaînes `YYYY-MM-DD`. `tzOffsetMinutes` = minutes à
 * AJOUTER à l'UTC pour obtenir l'heure locale (ex. +120 pour UTC+2). Côté client :
 * `-new Date().getTimezoneOffset()`.
 */

/** Clé de jour local (`YYYY-MM-DD`) d'un instant ISO, selon le décalage tz. */
export function localDayKey(isoUtc: string, tzOffsetMinutes: number): string {
  const localMs = new Date(isoUtc).getTime() + tzOffsetMinutes * 60_000;
  return new Date(localMs).toISOString().slice(0, 10);
}

/** Jour précédant une clé `YYYY-MM-DD` (gère les frontières de mois/année). */
export function previousDayKey(dayKey: string): string {
  const ms = new Date(`${dayKey}T00:00:00.000Z`).getTime() - 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Nombre de jours « satisfaits » consécutifs finissant aujourd'hui (ou hier si
 * aujourd'hui n'est pas encore satisfait). Non punitif.
 */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function currentStreak(
  satisfiedDays: ReadonlySet<string>,
  todayKey: string,
): number {
  // Dégradation non punitive (§8) : une clé invalide (horloge non prête, donnée
  // manquante) renvoie 0 au lieu de faire crasher le widget de streak.
  if (!DAY_KEY.test(todayKey)) return 0;
  let cursor = satisfiedDays.has(todayKey) ? todayKey : previousDayKey(todayKey);
  let streak = 0;
  while (satisfiedDays.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

/** Jours (clés locales) où un utilisateur a loggé au moins un goal. */
export function loggedDaysFor(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
): Set<string> {
  const days = new Set<string>();
  for (const item of items) {
    if (item.authorId === userId) {
      days.add(localDayKey(item.createdAt, tzOffsetMinutes));
    }
  }
  return days;
}

/** Union des jours loggés et des jours de repos (jours « satisfaits »). */
export function satisfiedDays(
  loggedDays: ReadonlySet<string>,
  restDays: ReadonlySet<string>,
): Set<string> {
  return new Set<string>([...loggedDays, ...restDays]);
}

/**
 * Streak personnel calculé directement depuis un feed : nombre de jours
 * consécutifs (finissant aujourd'hui ou hier) où l'utilisateur a loggé un goal.
 */
export function streakFromFeed(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
  nowIso: string,
): number {
  const todayKey = localDayKey(nowIso, tzOffsetMinutes);
  const days = loggedDaysFor(items, userId, tzOffsetMinutes);
  return currentStreak(days, todayKey);
}

/**
 * Jours « parfaits » du groupe : tous les membres ont participé ce jour-là.
 * `participationByDay` associe chaque jour à l'ensemble des userId ayant participé.
 * Un groupe vide n'a aucune journée parfaite.
 */
export function perfectDays(
  memberIds: readonly string[],
  participationByDay: ReadonlyMap<string, ReadonlySet<string>>,
): Set<string> {
  const perfect = new Set<string>();
  if (memberIds.length === 0) return perfect;
  for (const [day, participants] of participationByDay) {
    if (memberIds.every((id) => participants.has(id))) perfect.add(day);
  }
  return perfect;
}
