import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { MUSCU_TREE, nodeStates, unlockedFromFeed } from '@/domain/usecases/skill-tree';

function item(id: string, authorId: string, type: FeedItem['type']): FeedItem {
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt: '2026-07-01T08:00:00.000Z', summary: 's' };
}

describe('skill-tree', () => {
  it('compte les séances de l\'utilisateur comme paliers débloqués', () => {
    const items = [
      item('a', 'u1', 'session'),
      item('b', 'u1', 'session'),
      item('c', 'u1', 'meal'),
      item('d', 'u2', 'session'),
    ];
    expect(unlockedFromFeed(items, 'u1')).toBe(2);
    expect(unlockedFromFeed(items, 'u2')).toBe(1);
    expect(unlockedFromFeed(items, 'inconnu')).toBe(0);
  });

  it('plafonne au nombre de nœuds de l\'arbre', () => {
    const many = Array.from({ length: 20 }, (_, i) => item(`s${i}`, 'u1', 'session'));
    expect(unlockedFromFeed(many, 'u1')).toBe(MUSCU_TREE.nodes.length);
  });

  it('assigne done / available / locked', () => {
    const states = nodeStates(MUSCU_TREE, 2);
    expect(states[0].state).toBe('done');
    expect(states[1].state).toBe('done');
    expect(states[2].state).toBe('available');
    expect(states[3].state).toBe('locked');
  });
});
