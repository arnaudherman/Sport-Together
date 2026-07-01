import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import {
  capRestDays,
  currentStreak,
  loggedDaysFor,
  localDayKey,
  perfectDays,
  previousDayKey,
  restDaysFor,
  satisfiedDays,
  streakFromFeed,
} from '@/domain/usecases/streak';

function feedItem(authorId: string, createdAt: string, type: FeedItem['type'] = 'session'): FeedItem {
  return { id: `${createdAt}-${type}`, groupId: 'g', authorId, authorName: authorId, type, createdAt, summary: 's' };
}

describe('localDayKey', () => {
  it('décale vers le jour suivant en UTC+2 près de minuit', () => {
    expect(localDayKey('2026-06-30T23:30:00.000Z', 120)).toBe('2026-07-01');
  });

  it('décale vers le jour précédent en UTC-5 tôt le matin', () => {
    expect(localDayKey('2026-06-30T02:00:00.000Z', -300)).toBe('2026-06-29');
  });

  it('renvoie le même jour à midi UTC sans décalage', () => {
    expect(localDayKey('2026-06-30T12:00:00.000Z', 0)).toBe('2026-06-30');
  });
});

describe('previousDayKey', () => {
  it('recule d\'un jour ordinaire', () => {
    expect(previousDayKey('2026-06-30')).toBe('2026-06-29');
  });

  it('gère la frontière de mois', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
  });

  it('gère la frontière d\'année', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
  });
});

describe('currentStreak', () => {
  const today = '2026-06-30';

  it('est 0 sans aucun jour satisfait', () => {
    expect(currentStreak(new Set(), today)).toBe(0);
  });

  it('compte aujourd\'hui + jours consécutifs', () => {
    const days = new Set(['2026-06-30', '2026-06-29', '2026-06-28']);
    expect(currentStreak(days, today)).toBe(3);
  });

  it('laisse la grâce du jour en cours (aujourd\'hui non encore loggé)', () => {
    const days = new Set(['2026-06-29', '2026-06-28']);
    expect(currentStreak(days, today)).toBe(2);
  });

  it('vaut 0 si ni aujourd\'hui ni hier ne sont satisfaits', () => {
    const days = new Set(['2026-06-28', '2026-06-27']);
    expect(currentStreak(days, today)).toBe(0);
  });

  it('s\'arrête au premier trou', () => {
    const days = new Set(['2026-06-30', '2026-06-29', '2026-06-27']);
    expect(currentStreak(days, today)).toBe(2);
  });

  it('un jour de repos comble le trou et préserve le streak', () => {
    const logged = new Set(['2026-06-30', '2026-06-28']);
    const rest = new Set(['2026-06-29']);
    expect(currentStreak(satisfiedDays(logged, rest), today)).toBe(3);
  });

  it('renvoie 0 (sans crasher) sur une clé du jour vide ou malformée', () => {
    expect(currentStreak(new Set(), '')).toBe(0);
    expect(currentStreak(new Set(['2026-06-30']), '')).toBe(0);
    expect(currentStreak(new Set(['2026-06-30']), 'garbage')).toBe(0);
  });

  it('ignore les jours futurs et ne leur accorde pas la grâce', () => {
    expect(currentStreak(new Set(['2026-07-01']), today)).toBe(0);
    expect(currentStreak(new Set(['2026-07-01', '2026-06-30', '2026-06-29']), today)).toBe(2);
  });
});

describe('loggedDaysFor', () => {
  function item(id: string, authorId: string, createdAt: string): FeedItem {
    return { id, groupId: 'g', authorId, authorName: authorId, type: 'session', createdAt, summary: 's' };
  }

  it('ne retient que les jours de l\'utilisateur, en jours locaux', () => {
    const items = [
      item('a', 'u1', '2026-06-30T23:30:00.000Z'), // -> 2026-07-01 en UTC+2
      item('b', 'u1', '2026-06-30T08:00:00.000Z'), // -> 2026-06-30
      item('c', 'u2', '2026-06-30T08:00:00.000Z'), // autre user, ignoré
    ];
    const days = loggedDaysFor(items, 'u1', 120);
    expect([...days].sort()).toEqual(['2026-06-30', '2026-07-01']);
  });
});

describe('streakFromFeed', () => {
  it('calcule le streak personnel depuis le feed', () => {
    const now = '2026-06-30T12:00:00.000Z';
    const items = [
      feedItem('u1', '2026-06-30T08:00:00.000Z'),
      feedItem('u1', '2026-06-29T08:00:00.000Z'),
      feedItem('u2', '2026-06-30T08:00:00.000Z'),
    ];
    expect(streakFromFeed(items, 'u1', 0, now)).toBe(2);
    expect(streakFromFeed(items, 'u2', 0, now)).toBe(1);
    expect(streakFromFeed(items, 'inconnu', 0, now)).toBe(0);
  });

  it('un jour de repos protège le streak (vision §8, non punitif)', () => {
    const now = '2026-06-30T12:00:00.000Z';
    const items = [
      feedItem('u1', '2026-06-28T08:00:00.000Z'), // séance
      feedItem('u1', '2026-06-29T08:00:00.000Z', 'rest'), // repos posé
      feedItem('u1', '2026-06-30T08:00:00.000Z'), // séance
    ];
    expect(streakFromFeed(items, 'u1', 0, now)).toBe(3); // le repos ne casse pas la série
  });

  it('les repos sont bornés (2 / 7 jours glissants) — pas de streak farmable au repos', () => {
    const now = '2026-06-30T12:00:00.000Z';
    const items = [
      feedItem('u1', '2026-06-26T08:00:00.000Z'), // séance
      feedItem('u1', '2026-06-27T08:00:00.000Z', 'rest'),
      feedItem('u1', '2026-06-28T08:00:00.000Z', 'rest'),
      feedItem('u1', '2026-06-29T08:00:00.000Z', 'rest'), // 3e repos de la fenêtre : ignoré
      feedItem('u1', '2026-06-30T08:00:00.000Z'), // séance
    ];
    // La chaîne casse au 29 (repos non compté) : streak = 1 (aujourd'hui seulement).
    expect(streakFromFeed(items, 'u1', 0, now)).toBe(1);
  });
});

describe('restDaysFor / capRestDays', () => {
  it('sépare jours de repos et jours d\'activité', () => {
    const items = [
      feedItem('u1', '2026-06-29T08:00:00.000Z', 'rest'),
      feedItem('u1', '2026-06-30T08:00:00.000Z'),
    ];
    expect([...restDaysFor(items, 'u1', 0)]).toEqual(['2026-06-29']);
    expect([...loggedDaysFor(items, 'u1', 0)]).toEqual(['2026-06-30']);
  });

  it('borne à 2 repos par fenêtre de 7 jours (chronologique)', () => {
    const rest = new Set(['2026-06-25', '2026-06-26', '2026-06-28', '2026-07-03']);
    const capped = capRestDays(rest);
    // 25 et 26 gardés ; 28 = 3e repos dans la fenêtre [22/06..28/06] -> ignoré ;
    // 03/07 : sa fenêtre [27/06..03/07] ne contient aucun repos gardé -> gardé.
    expect([...capped].sort()).toEqual(['2026-06-25', '2026-06-26', '2026-07-03']);
  });
});

describe('perfectDays', () => {
  it('marque parfait un jour où tous les membres ont participé', () => {
    const members = ['u1', 'u2'];
    const participation = new Map<string, Set<string>>([
      ['2026-06-30', new Set(['u1', 'u2'])],
      ['2026-06-29', new Set(['u1'])],
    ]);
    expect([...perfectDays(members, participation)]).toEqual(['2026-06-30']);
  });

  it('un groupe vide n\'a aucune journée parfaite', () => {
    const participation = new Map<string, Set<string>>([['2026-06-30', new Set(['u1'])]]);
    expect(perfectDays([], participation).size).toBe(0);
  });
});
