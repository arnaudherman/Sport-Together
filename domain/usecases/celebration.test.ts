import { describe, expect, it } from '@jest/globals';

import { celebrationFor } from '@/domain/usecases/celebration';
import { levelForXp, xpForLevel } from '@/domain/usecases/gamification';

describe('celebrationFor', () => {
  it('célèbre un passage de niveau', () => {
    const before = { xp: xpForLevel(2), unlocked: 3 };
    const after = { xp: xpForLevel(3), unlocked: 3 };
    expect(celebrationFor(before, after)).toEqual({ kind: 'level', level: levelForXp(after.xp) });
  });

  it('célèbre un palier d\'arbre franchi (sans level-up)', () => {
    // Même XP (pas de level-up) mais un palier de plus.
    const xp = xpForLevel(2);
    const res = celebrationFor({ xp, unlocked: 0 }, { xp, unlocked: 1 });
    expect(res).toEqual({ kind: 'node', label: 'Base' });
  });

  it('donne la priorité au level-up sur le palier', () => {
    const res = celebrationFor({ xp: xpForLevel(1), unlocked: 0 }, { xp: xpForLevel(3), unlocked: 1 });
    expect(res?.kind).toBe('level');
  });

  it('ne célèbre rien si aucune progression notable', () => {
    const xp = xpForLevel(2);
    expect(celebrationFor({ xp, unlocked: 3 }, { xp, unlocked: 3 })).toBeNull();
  });
});
