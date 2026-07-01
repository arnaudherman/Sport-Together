import type { FeedItem } from '@/domain/entities/feed';
import { localDayKey } from '@/domain/usecases/streak';

/**
 * Radar de compétences (ADR-0009) — logique pure. Dérive des axes (0..10) à partir
 * du feed d'un utilisateur : progression personnelle, jamais une comparaison.
 */
export interface RadarAxis {
  label: string;
  value: number; // 0..10
}

const clamp10 = (n: number): number => Math.max(0, Math.min(10, n));

export function skillRadar(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes: number,
): RadarAxis[] {
  const mine = items.filter((it) => it.authorId === userId);
  let sessions = 0;
  let steps = 0;
  let meals = 0;
  const days = new Set<string>();
  for (const it of mine) {
    if (it.type === 'session') sessions += 1;
    else if (it.type === 'steps') steps += 1;
    else if (it.type === 'meal') meals += 1;
    days.add(localDayKey(it.createdAt, tzOffsetMinutes));
  }
  return [
    { label: 'Force', value: clamp10(sessions * 2.5) },
    { label: 'Cardio', value: clamp10((sessions + steps) * 1.8) },
    { label: 'Endurance', value: clamp10(steps * 3) },
    { label: 'Régularité', value: clamp10(days.size * 3) },
    { label: 'Nutrition', value: clamp10(meals * 3) },
    { label: 'Assiduité', value: clamp10(mine.length * 1.5) },
  ];
}
