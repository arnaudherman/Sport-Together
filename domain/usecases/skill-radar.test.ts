import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { skillRadar } from '@/domain/usecases/skill-radar';

function item(id: string, authorId: string, type: FeedItem['type'], createdAt: string): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt, summary: 's' };
}

describe('skill-radar', () => {
  it('dérive 6 axes bornés à 0..10 pour l\'utilisateur', () => {
    const items = [
      item('a', 'u1', 'session', '2026-07-01T08:00:00.000Z'),
      item('b', 'u1', 'session', '2026-06-30T08:00:00.000Z'),
      item('c', 'u1', 'meal', '2026-07-01T12:00:00.000Z'),
      item('d', 'u2', 'session', '2026-07-01T08:00:00.000Z'),
    ];
    const axes = skillRadar(items, 'u1', 0);
    expect(axes).toHaveLength(6);
    for (const ax of axes) {
      expect(ax.value).toBeGreaterThanOrEqual(0);
      expect(ax.value).toBeLessThanOrEqual(10);
    }
    // Force = sessions(2) * 2.5 = 5
    expect(axes.find((a) => a.label === 'Force')?.value).toBe(5);
    // Nutrition = meals(1) * 3 = 3
    expect(axes.find((a) => a.label === 'Nutrition')?.value).toBe(3);
  });

  it('renvoie des zéros pour un utilisateur sans activité', () => {
    const axes = skillRadar([], 'inconnu', 0);
    expect(axes.every((a) => a.value === 0)).toBe(true);
  });
});
