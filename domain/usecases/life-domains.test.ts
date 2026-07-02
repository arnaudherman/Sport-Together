import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { LIFE_DOMAINS, lifeProgress } from '@/domain/usecases/life-domains';

function item(id: string, type: FeedItem['type'], day: string, authorId = 'u1'): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt: `2026-07-${day}T08:00:00.000Z`, summary: 's' };
}

const domain = (items: FeedItem[], key: string) => lifeProgress(items, 'u1', 0).find((d) => d.def.key === key)!;

describe('life-domains — arbre de vie', () => {
  it('couvre les 5 domaines de qualité de vie', () => {
    expect(LIFE_DOMAINS.map((d) => d.key)).toEqual(['sport', 'steps', 'sleep', 'nutrition', 'rhythm']);
  });

  it('mesure des JOURS distincts par domaine (non farmable)', () => {
    const items = [
      item('a', 'session', '10'),
      item('b', 'session', '10'), // même jour -> 1 seul jour
      item('c', 'session', '11'),
      item('d', 'sleep', '11'),
      item('e', 'meal', '12'),
      item('f', 'steps', '12'),
    ];
    expect(domain(items, 'sport').value).toBe(2);
    expect(domain(items, 'sleep').value).toBe(1);
    expect(domain(items, 'nutrition').value).toBe(1);
    expect(domain(items, 'steps').value).toBe(1);
  });

  it('déclenche les paliers et calcule la progression vers le suivant', () => {
    const items = [
      item('a', 'session', '10'),
      item('b', 'session', '11'),
    ];
    const sport = domain(items, 'sport');
    expect(sport.done).toBe(1); // « Première séance » (target 1) atteint
    expect(sport.next?.target).toBe(3);
    expect(sport.ratioToNext).toBeCloseTo((2 - 1) / (3 - 1), 5); // 0.5
  });

  it('le domaine Rythme mesure la meilleure série (repos compris)', () => {
    const items = [
      item('a', 'session', '10'),
      item('b', 'rest', '11'), // repos protège
      item('c', 'session', '12'),
      // trou le 13
      item('d', 'session', '14'),
    ];
    const rhythm = domain(items, 'rhythm');
    expect(rhythm.value).toBe(3); // 10-11-12
    expect(rhythm.done).toBe(1); // palier « 3 jours de suite »
  });

  it("ne compte que l'utilisateur demandé", () => {
    const items = [item('a', 'session', '10'), item('b', 'session', '11', 'autre')];
    expect(domain(items, 'sport').value).toBe(1);
  });

  it('un domaine complété a ratioToNext = 1 et pas de next', () => {
    const items = Array.from({ length: 61 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 3, 1 + i)).toISOString();
      return { id: `s${i}`, groupId: 'g', authorId: 'u1', authorName: 'u1', type: 'steps', createdAt: d, summary: 's' } as FeedItem;
    });
    const steps = domain(items, 'steps');
    expect(steps.done).toBe(steps.def.milestones.length);
    expect(steps.next).toBeUndefined();
    expect(steps.ratioToNext).toBe(1);
  });
});
