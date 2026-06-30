import { describe, expect, it } from '@jest/globals';

import { InMemoryReactionStore } from '@/data/reaction/in-memory-reaction-store';

describe('InMemoryReactionStore', () => {
  it('compte les réactions et identifie celles de l\'utilisateur', () => {
    const store = new InMemoryReactionStore();
    store.add('f1', 'kudos', 'me');
    store.add('f1', 'kudos', 'other');
    store.add('f1', 'encouragement', 'me');

    const summary = store.summaryFor('f1', 'me');
    expect(summary.kudos).toBe(2);
    expect(summary.encouragement).toBe(1);
    expect(summary.mine.sort()).toEqual(['encouragement', 'kudos']);
  });

  it('le retrait décrémente et retire de mine', () => {
    const store = new InMemoryReactionStore();
    store.add('f1', 'kudos', 'me');
    store.remove('f1', 'kudos', 'me');

    const summary = store.summaryFor('f1', 'me');
    expect(summary.kudos).toBe(0);
    expect(summary.mine).toEqual([]);
  });

  it('renvoie un agrégat vide pour une entrée inconnue', () => {
    const store = new InMemoryReactionStore();
    expect(store.summaryFor('absent', 'me')).toEqual({ kudos: 0, encouragement: 0, mine: [] });
  });
});
