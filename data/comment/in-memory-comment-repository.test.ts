import { describe, expect, it } from '@jest/globals';

import { InMemoryCommentRepository } from '@/data/comment/in-memory-comment-repository';
import { InMemoryCommentStore } from '@/data/comment/in-memory-comment-store';

describe('InMemoryCommentRepository', () => {
  it('ajoute et liste les commentaires d\'un post', async () => {
    const store = new InMemoryCommentStore();
    const repo = new InMemoryCommentRepository(store, 'u1');
    expect(await repo.listForItem('p1')).toHaveLength(0);
    await repo.add('p1', 'Bien joué');
    await repo.add('p1', 'Continue');
    const list = await repo.listForItem('p1');
    expect(list).toHaveLength(2);
    expect(list[0].text).toBe('Bien joué');
    expect(store.count('p1')).toBe(2);
    expect(store.count('autre')).toBe(0);
  });
});
