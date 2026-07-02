import { describe, expect, it } from '@jest/globals';

import type { FeedItem } from '@/domain/entities/feed';
import {
  DAILY_CAP,
  levelForXp,
  levelProgress,
  VARIETY_BONUS,
  xpBreakdown,
  xpForLevel,
  xpForType,
  xpFromFeed,
} from '@/domain/usecases/gamification';

function item(id: string, authorId: string, type: FeedItem['type'], day = '15', hour = 8): FeedItem {
  const h = String(hour).padStart(2, '0');
  return { id, groupId: 'g', authorId, authorName: authorId, type, createdAt: `2026-07-${day}T${h}:00:00.000Z`, summary: 's' };
}

describe('gamification v2 — moteur XP', () => {
  it("attribue l'XP de base par type", () => {
    expect(xpForType('session')).toBe(50);
    expect(xpForType('steps')).toBe(30);
    expect(xpForType('meal')).toBe(20);
    expect(xpForType('rest')).toBe(10);
  });

  it('cumule normalement des jours et types différents', () => {
    const items = [
      item('a', 'u1', 'session', '13'),
      item('b', 'u1', 'meal', '14'),
      item('c', 'u2', 'session', '15'),
    ];
    expect(xpFromFeed(items, 'u1')).toBe(70);
    expect(xpFromFeed(items, 'u2')).toBe(50);
    expect(xpFromFeed(items, 'inconnu')).toBe(0);
  });

  it('RENDEMENTS DÉCROISSANTS : spammer un type le même jour ne rapporte presque rien', () => {
    const spam = Array.from({ length: 5 }, (_, i) => item(`s${i}`, 'u1', 'session', '15', 8 + i));
    // 50 + 25 + 10 + 0 + 0 = 85 — loin de 5×50 = 250.
    expect(xpFromFeed(spam, 'u1')).toBe(85);
    // Le même volume étalé sur 5 jours rapporte le plein tarif.
    const spread = Array.from({ length: 5 }, (_, i) => item(`d${i}`, 'u1', 'session', String(11 + i)));
    expect(xpFromFeed(spread, 'u1')).toBe(250);
  });

  it("l'XP par post reflète la décroissance (affichage honnête)", () => {
    const items = [
      item('first', 'u1', 'session', '15', 8),
      item('second', 'u1', 'session', '15', 10),
    ];
    const { byItem } = xpBreakdown(items, 'u1');
    expect(byItem.get('first')).toBe(50);
    expect(byItem.get('second')).toBe(25);
  });

  it('PLAFOND QUOTIDIEN : une grosse journée est bornée', () => {
    // session 50 + steps 30 + meal 20 + rest 10 = 110 ; 2e session +25 → 135 > cap 120.
    const items = [
      item('a', 'u1', 'session', '15', 7),
      item('b', 'u1', 'steps', '15', 9),
      item('c', 'u1', 'meal', '15', 12),
      item('d', 'u1', 'rest', '15', 13),
      item('e', 'u1', 'session', '15', 18),
    ];
    const total = xpFromFeed(items, 'u1');
    expect(total).toBe(DAILY_CAP + VARIETY_BONUS); // plafonné, + bonus variété
  });

  it('BONUS VARIÉTÉ : ≥ 3 types différents dans la journée', () => {
    const items = [
      item('a', 'u1', 'session', '15'),
      item('b', 'u1', 'steps', '15', 10),
      item('c', 'u1', 'meal', '15', 12),
    ];
    expect(xpFromFeed(items, 'u1')).toBe(50 + 30 + 20 + VARIETY_BONUS);
  });

  it('BONUS RÉGULARITÉ : +10 % à partir de 7 jours de série consécutifs', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      item(`d${i}`, 'u1', 'session', String(10 + i).padStart(2, '0')),
    );
    // Jours 1..6 : 50 ; jours 7 et 8 : 55.
    expect(xpFromFeed(items, 'u1')).toBe(6 * 50 + 2 * 55);
  });

  it('une interruption de série remet le bonus à zéro', () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) => item(`a${i}`, 'u1', 'session', String(10 + i).padStart(2, '0'))),
      // trou le 17 —
      item('b', 'u1', 'session', '18'),
    ];
    // 6×50 + 55 (7e jour) + 50 (série repartie à 1)
    expect(xpFromFeed(items, 'u1')).toBe(6 * 50 + 55 + 50);
  });

  it('le bonus régularité ne se farme PAS au repos (repos borné 2/7 comme le streak affiché)', () => {
    // 10 jours de repos consécutifs : seuls 2/7 comptent comme satisfaits ->
    // jamais 7 jours de série -> aucun bonus (10 XP/jour plats).
    const restOnly = Array.from({ length: 10 }, (_, i) =>
      item(`r${i}`, 'u1', 'rest', String(10 + i).padStart(2, '0')),
    );
    expect(xpFromFeed(restOnly, 'u1')).toBe(10 * 10);
  });

  it('mappe XP <-> niveau de façon cohérente', () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(50)).toBe(1);
    expect(levelForXp(199)).toBe(1);
    expect(levelForXp(200)).toBe(2);
    expect(xpForLevel(2)).toBe(200);
  });

  it('calcule la progression dans le niveau courant', () => {
    const p = levelProgress(125); // niveau 1 : [50, 200[
    expect(p.level).toBe(1);
    expect(p.into).toBe(75);
    expect(p.span).toBe(150);
    expect(p.ratio).toBeCloseTo(0.5, 5);
  });
});
