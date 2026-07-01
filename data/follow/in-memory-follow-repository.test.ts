import { describe, expect, it } from '@jest/globals';

import { InMemoryFollowRepository } from '@/data/follow/in-memory-follow-repository';

describe('InMemoryFollowRepository', () => {
  it('pré-seede des abonnements de démo', async () => {
    const repo = new InMemoryFollowRepository();
    expect(await repo.isFollowing('u-sam')).toBe(true);
    expect(await repo.isFollowing('u-lea')).toBe(false); // à découvrir
    expect(await repo.isFollowing('inconnu')).toBe(false);
  });

  it('suit et arrête de suivre (idempotent)', async () => {
    const repo = new InMemoryFollowRepository();
    await repo.follow('u-x');
    await repo.follow('u-x'); // idempotent
    expect(await repo.isFollowing('u-x')).toBe(true);
    expect(await repo.listFollowing()).toContain('u-x');
    await repo.unfollow('u-x');
    expect(await repo.isFollowing('u-x')).toBe(false);
  });
});
