import { describe, expect, it } from '@jest/globals';

import { localDayKey } from '@/domain/usecases/streak';
import { avatarColor, dayBucketLabel, handle, initial, timeAgo } from '@/ui/format';

const NOW = Date.UTC(2026, 6, 15, 12, 0, 0); // 2026-07-15T12:00:00Z
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('handle', () => {
  it('normalise pseudo -> @handle (minuscules, sans accents ni espaces)', () => {
    expect(handle('Léa Martin')).toBe('@lea_martin');
    expect(handle('Noa')).toBe('@noa');
  });
  it('retombe sur @user quand il ne reste rien', () => {
    expect(handle('   ')).toBe('@user');
    expect(handle('@#!')).toBe('@user');
  });
});

describe('timeAgo', () => {
  it('gère les seuils relatifs', () => {
    expect(timeAgo(ago(30 * SEC), NOW)).toBe("à l'instant");
    expect(timeAgo(ago(5 * MIN), NOW)).toBe('il y a 5 min');
    expect(timeAgo(ago(3 * HOUR), NOW)).toBe('il y a 3 h');
    expect(timeAgo(ago(DAY), NOW)).toBe('hier');
    expect(timeAgo(ago(3 * DAY), NOW)).toBe('il y a 3 j');
  });
  it('bascule sur une date au-delà de 7 jours', () => {
    const far = timeAgo(ago(10 * DAY), NOW);
    expect(far).not.toContain('il y a');
    expect(far).not.toBe('hier');
  });
  it('un instant futur est borné à « à l\'instant »', () => {
    expect(timeAgo(new Date(NOW + HOUR).toISOString(), NOW)).toBe("à l'instant");
  });
});

describe('dayBucketLabel', () => {
  const todayKey = localDayKey(new Date(NOW).toISOString(), 0);
  it("étiquette aujourd'hui / hier / plus tôt", () => {
    expect(dayBucketLabel(new Date(NOW).toISOString(), 0, todayKey)).toBe("Aujourd'hui");
    expect(dayBucketLabel(ago(DAY), 0, todayKey)).toBe('Hier');
    expect(dayBucketLabel(ago(3 * DAY), 0, todayKey)).toBe('Plus tôt');
  });
});

describe('avatarColor', () => {
  it('est déterministe et renvoie une entrée de la palette', () => {
    const a = avatarColor('u-lea');
    const b = avatarColor('u-lea');
    expect(a).toEqual(b);
    expect(typeof a.bg).toBe('string');
    expect(typeof a.fg).toBe('string');
  });
});

describe('initial', () => {
  it("renvoie l'initiale majuscule, « ? » si vide", () => {
    expect(initial('léa')).toBe('L');
    expect(initial('  bob')).toBe('B');
    expect(initial('')).toBe('?');
  });
});
