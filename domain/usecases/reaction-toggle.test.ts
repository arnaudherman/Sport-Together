import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import { withToggledReaction } from '@/domain/usecases/reaction-toggle';

function item(reactions?: FeedItem['reactions']): FeedItem {
  return { id: 'a', groupId: 'g', authorId: 'u', authorName: 'U', type: 'session', createdAt: '2026-07-01T08:00:00.000Z', summary: 's', reactions };
}

describe('withToggledReaction', () => {
  it('active une réaction sur un item sans réactions', () => {
    const r = withToggledReaction(item(), 'kudos', true).reactions!;
    expect(r.kudos).toBe(1);
    expect(r.mine).toEqual(['kudos']);
  });

  it('est idempotent sur mine (activer deux fois ne duplique pas)', () => {
    const once = withToggledReaction(item(), 'kudos', true);
    const twice = withToggledReaction(once, 'kudos', true);
    expect(twice.reactions!.mine).toEqual(['kudos']);
    expect(twice.reactions!.kudos).toBe(2); // le compteur, lui, suit les appels
  });

  it('désactiver ramène à 0 et vide mine', () => {
    const on = withToggledReaction(item(), 'encouragement', true);
    const off = withToggledReaction(on, 'encouragement', false);
    expect(off.reactions!.encouragement).toBe(0);
    expect(off.reactions!.mine).toEqual([]);
  });

  it('ne descend jamais sous 0 (double désactivation / rollback partiel)', () => {
    const off = withToggledReaction(item({ kudos: 0, encouragement: 0, mine: [] }), 'kudos', false);
    expect(off.reactions!.kudos).toBe(0);
  });

  it("n'affecte que le type ciblé", () => {
    const start = item({ kudos: 3, encouragement: 5, mine: [] });
    const r = withToggledReaction(start, 'kudos', true).reactions!;
    expect(r.kudos).toBe(4);
    expect(r.encouragement).toBe(5);
  });
});
