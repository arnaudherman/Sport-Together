import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { isPerfectDay } from '@/domain/usecases/perfect-day';

function item(authorId: string): FeedItem {
  return {
    id: authorId,
    groupId: 'g',
    authorId,
    authorName: authorId,
    type: 'session',
    createdAt: '2026-06-30T08:00:00.000Z',
    summary: 's',
  };
}

describe('isPerfectDay', () => {
  it('est vrai quand tous les membres ont loggé', () => {
    expect(isPerfectDay(['u1', 'u2'], [item('u1'), item('u2')])).toBe(true);
  });

  it('est faux quand un membre manque (relance, pas casse collective)', () => {
    expect(isPerfectDay(['u1', 'u2', 'u3'], [item('u1'), item('u2')])).toBe(false);
  });

  it('est faux pour un groupe vide', () => {
    expect(isPerfectDay([], [])).toBe(false);
  });
});
