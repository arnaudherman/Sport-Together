import type { FeedItem, FeedItemType } from '@/domain/entities/feed';
import {
  capRestDays,
  localDayKey,
  loggedDaysFor,
  longestStreak,
  restDaysFor,
  satisfiedDays,
} from '@/domain/usecases/streak';

/**
 * Domaines de vie (arbre de compétences v2) — tout ce qui améliore la qualité de
 * vie : sport, pas, sommeil, nutrition, rythme. Chaque domaine a des PALIERS
 * mesurés en JOURS DISTINCTS (non farmable : 10 posts le même jour = 1 jour),
 * sauf « Rythme » qui mesure la meilleure série (repos compris, borné).
 * Logique pure — dérivée du feed, testable sans backend.
 */
export interface LifeMilestone {
  target: number;
  label: string;
}

export interface LifeDomainDef {
  key: 'sport' | 'steps' | 'sleep' | 'nutrition' | 'rhythm';
  label: string;
  icon: string;
  /** Unité de la métrique (affichage : « 12 jours », « série de 9 »). */
  unit: string;
  milestones: LifeMilestone[];
}

export const LIFE_DOMAINS: LifeDomainDef[] = [
  {
    key: 'sport',
    label: 'Sport',
    icon: '💪',
    unit: 'jours d’entraînement',
    milestones: [
      { target: 1, label: 'Première séance' },
      { target: 3, label: 'Mise en route' },
      { target: 7, label: 'Une semaine active' },
      { target: 15, label: 'Le pli est pris' },
      { target: 30, label: 'Un mois de sport' },
      { target: 60, label: 'Discipline' },
      { target: 100, label: 'Athlète' },
    ],
  },
  {
    key: 'steps',
    label: 'Pas',
    icon: '👟',
    unit: 'jours de marche',
    milestones: [
      { target: 1, label: 'Premiers pas' },
      { target: 5, label: 'Marcheur régulier' },
      { target: 15, label: 'La marche est un réflexe' },
      { target: 30, label: 'Grand marcheur' },
      { target: 60, label: 'Infatigable' },
    ],
  },
  {
    key: 'sleep',
    label: 'Sommeil',
    icon: '🌙',
    unit: 'nuits suivies',
    milestones: [
      { target: 1, label: 'Première nuit suivie' },
      { target: 5, label: 'Le sommeil compte' },
      { target: 15, label: 'Routine du soir' },
      { target: 30, label: 'Dormeur discipliné' },
      { target: 60, label: 'Maître du sommeil' },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    icon: '🥗',
    unit: 'jours suivis',
    milestones: [
      { target: 1, label: 'Premier repas suivi' },
      { target: 5, label: 'On regarde l’assiette' },
      { target: 15, label: 'Habitude installée' },
      { target: 30, label: 'Équilibre durable' },
      { target: 60, label: 'Nutrition maîtrisée' },
    ],
  },
  {
    key: 'rhythm',
    label: 'Rythme',
    icon: '🔥',
    unit: 'meilleure série',
    milestones: [
      { target: 3, label: '3 jours de suite' },
      { target: 7, label: 'Une semaine complète' },
      { target: 14, label: 'Deux semaines' },
      { target: 30, label: 'Un mois sans lâcher' },
      { target: 60, label: 'Inarrêtable' },
    ],
  },
];

export interface DomainProgress {
  def: LifeDomainDef;
  /** Valeur de la métrique (jours distincts, ou meilleure série pour rhythm). */
  value: number;
  /** Nombre de paliers atteints. */
  done: number;
  /** Prochain palier (absent si le domaine est complété). */
  next?: LifeMilestone;
  /** Progression 0..1 vers le prochain palier (1 si complété). */
  ratioToNext: number;
}

function distinctDaysOfType(
  items: readonly FeedItem[],
  userId: string,
  type: FeedItemType,
  tzOffsetMinutes: number,
): number {
  const days = new Set<string>();
  for (const it of items) {
    if (it.authorId === userId && it.type === type) {
      days.add(localDayKey(it.createdAt, tzOffsetMinutes));
    }
  }
  return days.size;
}

/** Progression de l'utilisateur dans chaque domaine de vie. */
export function lifeProgress(
  items: readonly FeedItem[],
  userId: string,
  tzOffsetMinutes = 0,
): DomainProgress[] {
  const metric = (key: LifeDomainDef['key']): number => {
    if (key === 'rhythm') {
      const logged = loggedDaysFor(items, userId, tzOffsetMinutes);
      const rest = capRestDays(restDaysFor(items, userId, tzOffsetMinutes));
      return longestStreak(satisfiedDays(logged, rest));
    }
    const type: FeedItemType =
      key === 'sport' ? 'session' : key === 'steps' ? 'steps' : key === 'sleep' ? 'sleep' : 'meal';
    return distinctDaysOfType(items, userId, type, tzOffsetMinutes);
  };

  return LIFE_DOMAINS.map((def) => {
    const value = metric(def.key);
    const done = def.milestones.filter((m) => value >= m.target).length;
    const next = def.milestones[done];
    const prevTarget = done > 0 ? def.milestones[done - 1].target : 0;
    const ratioToNext = next
      ? Math.min(1, Math.max(0, (value - prevTarget) / (next.target - prevTarget)))
      : 1;
    return { def, value, done, next, ratioToNext };
  });
}
