import { describe, expect, it } from '@jest/globals';

import type { FeedItem, FeedItemType } from '@/domain/entities/feed';
import { weeklyQuests } from '@/domain/usecases/quests';

const NOW = '2026-07-15T12:00:00.000Z'; // mercredi ; semaine locale lun 13 -> dim 19 (tz 0)

function post(id: string, type: FeedItemType, day: string, authorId = 'u'): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt: `2026-07-${day}T10:00:00.000Z`, summary: 's' };
}

const quest = (items: FeedItem[], id: string) => weeklyQuests(items, 'u', NOW, 0).find((q) => q.id === id)!;

describe('weeklyQuests', () => {
  it('compte les séances de la semaine locale (exclut la semaine précédente)', () => {
    const items = [
      post('a', 'session', '13'),
      post('b', 'session', '14'),
      post('c', 'session', '15'),
      post('x', 'session', '10'), // vendredi précédent -> hors semaine
    ];
    const q = quest(items, 'sessions');
    expect(q.current).toBe(3);
    expect(q.done).toBe(true);
  });

  it('« bouge 4 jours » compte des jours distincts (séances + pas), même jour = 1', () => {
    const items = [
      post('a', 'session', '13'),
      post('b', 'session', '13'), // même jour -> ne compte qu'une fois
      post('c', 'steps', '14'),
      post('d', 'session', '15'),
    ];
    const q = quest(items, 'days');
    expect(q.current).toBe(3); // 13, 14, 15
    expect(q.done).toBe(false);
  });

  it("borne l'affichage à la cible mais `done` reflète le dépassement", () => {
    const items = Array.from({ length: 7 }, (_, i) => post('p' + i, 'session', '13'));
    const q = quest(items, 'posts');
    expect(q.current).toBe(5); // clampé à la cible
    expect(q.done).toBe(true);
  });

  it("ne compte que les posts de l'utilisateur", () => {
    const items = [post('a', 'session', '13'), post('b', 'session', '14', 'other')];
    expect(quest(items, 'sessions').current).toBe(1);
  });
});
