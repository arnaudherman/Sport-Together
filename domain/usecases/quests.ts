import type { FeedItem } from '@/domain/entities/feed';
import { localDayKey } from '@/domain/usecases/streak';

export interface Quest {
  id: string;
  label: string;
  current: number;
  target: number;
  done: boolean;
  xpReward: number;
}

/** Les 7 clés de jour (lundi→dimanche) de la semaine locale contenant `nowIso`. */
function weekDayKeys(nowIso: string, tzOffsetMinutes: number): Set<string> {
  const localMs = new Date(nowIso).getTime() + tzOffsetMinutes * 60_000;
  const dow = new Date(localMs).getUTCDay(); // 0=dimanche..6=samedi (heure locale)
  const sinceMonday = (dow + 6) % 7;
  const mondayMs = localMs - sinceMonday * 86_400_000;
  const keys = new Set<string>();
  for (let i = 0; i < 7; i += 1) keys.add(new Date(mondayMs + i * 86_400_000).toISOString().slice(0, 10));
  return keys;
}

/**
 * Quêtes hebdomadaires perso (GAMIFICATION.md) — dérivées du feed, sans table ni Edge
 * Function. Fenêtre = semaine locale (lundi→dimanche) contenant `nowIso`. Objectifs
 * court-terme cochables qui donnent une raison de revenir cette semaine (rétention solo).
 */
export function weeklyQuests(
  items: readonly FeedItem[],
  userId: string,
  nowIso: string,
  tzOffsetMinutes = 0,
): Quest[] {
  const week = weekDayKeys(nowIso, tzOffsetMinutes);
  const mine = items.filter(
    (it) => it.authorId === userId && week.has(localDayKey(it.createdAt, tzOffsetMinutes)),
  );
  const sessions = mine.filter((it) => it.type === 'session').length;
  const activeDays = new Set(
    mine
      .filter((it) => it.type === 'session' || it.type === 'steps')
      .map((it) => localDayKey(it.createdAt, tzOffsetMinutes)),
  ).size;
  const posts = mine.length;

  const make = (id: string, label: string, current: number, target: number, xpReward: number): Quest => ({
    id,
    label,
    current: Math.min(current, target),
    target,
    done: current >= target,
    xpReward,
  });

  return [
    make('sessions', '3 séances cette semaine', sessions, 3, 60),
    make('days', 'Bouge 4 jours différents', activeDays, 4, 80),
    make('posts', 'Publie 5 fois', posts, 5, 50),
  ];
}
