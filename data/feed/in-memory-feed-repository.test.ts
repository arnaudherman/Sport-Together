import { describe, expect, it } from '@jest/globals';

import { DEMO_FEED, InMemoryFeedRepository } from '@/data/feed/in-memory-feed-repository';
import type { FeedItem } from '@/domain/entities/feed';

const SAMPLE: FeedItem[] = [
  {
    id: 'a',
    groupId: 'g1',
    authorId: 'u1',
    authorName: 'A',
    type: 'session',
    createdAt: '2026-06-30T08:00:00.000Z',
    summary: 'x',
  },
  {
    id: 'b',
    groupId: 'g2',
    authorId: 'u2',
    authorName: 'B',
    type: 'session',
    createdAt: '2026-06-30T09:00:00.000Z',
    summary: 'y',
  },
];

describe('InMemoryFeedRepository', () => {
  it('ne renvoie que les entrées du groupe demandé (isolation, ADR-0004)', async () => {
    const repo = new InMemoryFeedRepository(SAMPLE);
    const feed = await repo.listGroupFeed('g1');
    expect(feed.map((entry) => entry.id)).toEqual(['a']);
  });

  it('trie du plus récent au plus ancien (ADR-0002)', async () => {
    const repo = new InMemoryFeedRepository();
    const feed = await repo.listGroupFeed('demo-group');
    const dates = feed.map((entry) => entry.createdAt);
    const expected = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(expected);
    expect(feed.length).toBe(DEMO_FEED.length);
  });

  it('supprime un post (deletePost)', async () => {
    const repo = new InMemoryFeedRepository(SAMPLE);
    await repo.deletePost('a');
    const feed = await repo.listGroupFeed('g1');
    expect(feed).toHaveLength(0);
  });

  it('publie en SOLO (groupId null) → post rattaché à "solo" (contrat mock, cf. Supabase qui rejette)', async () => {
    const repo = new InMemoryFeedRepository([]);
    await repo.logSession(null, 'Course', 30);
    const feed = await repo.listUserFeed('local-user');
    expect(feed).toHaveLength(1);
    expect(feed[0].groupId).toBe('solo');
    expect(feed[0].groupName).toBeUndefined();
  });
});
