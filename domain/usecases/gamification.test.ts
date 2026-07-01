import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import {
  levelForXp,
  levelProgress,
  xpForLevel,
  xpForType,
  xpFromFeed,
} from '@/domain/usecases/gamification';

function item(id: string, authorId: string, type: FeedItem['type']): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt: '2026-06-30T08:00:00.000Z', summary: 's' };
}

describe('gamification', () => {
  it('attribue l\'XP par type de goal', () => {
    expect(xpForType('session')).toBe(50);
    expect(xpForType('steps')).toBe(30);
    expect(xpForType('meal')).toBe(20);
  });

  it('cumule l\'XP du feed pour un utilisateur', () => {
    const items = [
      item('a', 'u1', 'session'),
      item('b', 'u1', 'meal'),
      item('c', 'u2', 'session'),
    ];
    expect(xpFromFeed(items, 'u1')).toBe(70);
    expect(xpFromFeed(items, 'u2')).toBe(50);
    expect(xpFromFeed(items, 'inconnu')).toBe(0);
  });

  it('mappe XP <-> niveau de façon cohérente', () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(50)).toBe(1);
    expect(levelForXp(199)).toBe(1);
    expect(levelForXp(200)).toBe(2);
    expect(xpForLevel(2)).toBe(200);
  });

  it('calcule la progression dans le niveau courant', () => {
    const p = levelProgress(125); // niveau 1 : [50, 200[
    expect(p.level).toBe(1);
    expect(p.into).toBe(75);
    expect(p.span).toBe(150);
    expect(p.ratio).toBeCloseTo(0.5, 5);
  });
});
