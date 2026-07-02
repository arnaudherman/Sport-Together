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

/** Plus longue série de jours consécutifs dans un ensemble de jours satisfaits. */
export function longestStreak(satisfied: ReadonlySet<string>): number {
  let best = 0;
  for (const day of satisfied) {
    // Ne compter qu'à partir des débuts de série (pas de prédécesseur).
    if (satisfied.has(previousDayKey(day))) continue;
    let len = 0;
    let cursor = day;
    while (satisfied.has(cursor)) {
      len += 1;
      const ms = new Date(`${cursor}T00:00:00.000Z`).getTime() + 86_400_000;
      cursor = new Date(ms).toISOString().slice(0, 10);
    }
    if (len > best) best = len;
  }
  return best;
}

/** Jours (clés locales) où un utilisateur a loggé au moins un goal (hors repos). */
export function loggedDaysFor(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
): Set<string> {
  const days = new Set<string>();
  for (const item of items) {
    if (item.authorId === userId && item.type !== 'rest') {
      days.add(localDayKey(item.createdAt, tzOffsetMinutes));
    }
  }
  return days;
}

/** Jours (clés locales) où un utilisateur a posé un jour de repos. */
export function restDaysFor(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
): Set<string> {
  const days = new Set<string>();
  for (const item of items) {
    if (item.authorId === userId && item.type === 'rest') {
      days.add(localDayKey(item.createdAt, tzOffsetMinutes));
    }
  }
  return days;
}

/**
 * Borne bienveillante des jours de repos : au plus `maxPerWindow` repos comptés
 * par fenêtre glissante de `windowDays` jours (chronologique). Le repos protège
 * le streak sans permettre de l'entretenir indéfiniment sans bouger.
 */
export function capRestDays(
  restDays: ReadonlySet<string>,
  maxPerWindow = 2,
  windowDays = 7,
): Set<string> {
  const sorted = [...restDays].filter((d) => DAY_KEY.test(d)).sort();
  const kept: string[] = [];
  for (const day of sorted) {
    const windowStartMs = new Date(`${day}T00:00:00.000Z`).getTime() - (windowDays - 1) * 86_400_000;
    const inWindow = kept.filter((k) => new Date(`${k}T00:00:00.000Z`).getTime() >= windowStartMs);
    if (inWindow.length < maxPerWindow) kept.push(day);
  }
  return new Set(kept);
}

/** Union des jours loggés et des jours de repos (jours « satisfaits »). */
export function satisfiedDays(
  loggedDays: ReadonlySet<string>,
  restDays: ReadonlySet<string>,
): Set<string> {
  return new Set<string>([...loggedDays, ...restDays]);
}

/**
 * Streak personnel calculé directement depuis un feed : jours consécutifs
 * (finissant aujourd'hui ou hier) où l'utilisateur a loggé un goal OU posé un
 * jour de repos (borné à 2 repos / 7 jours glissants — non punitif, non farmable).
 */
export function streakFromFeed(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
  nowIso: string,
): number {
  const todayKey = localDayKey(nowIso, tzOffsetMinutes);
  const logged = loggedDaysFor(items, userId, tzOffsetMinutes);
  const rest = capRestDays(restDaysFor(items, userId, tzOffsetMinutes));
  return currentStreak(satisfiedDays(logged, rest), todayKey);
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
