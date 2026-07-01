import { describe, expect, it } from '@jest/globals';

import { MAX_CALORIES, MAX_MACRO_G, validateMeal } from '@/domain/usecases/nutrition';

describe('validateMeal (garde-fous ADR-0008)', () => {
  it('accepte un repas valide avec macros', () => {
    expect(
      validateMeal({ label: 'Bowl poulet-quinoa', caloriesKcal: 600, proteinG: 40, carbsG: 50, fatG: 15 }),
    ).toEqual({ ok: true });
  });

  it('accepte un repas sans aucune valeur chiffrée', () => {
    expect(validateMeal({ label: 'Déjeuner' })).toEqual({ ok: true });
  });

  it('refuse un libellé vide', () => {
    const result = validateMeal({ label: '   ' });
    expect(result.ok).toBe(false);
  });

  it('refuse une valeur négative', () => {
    const result = validateMeal({ label: 'Repas', proteinG: -5 });
    expect(result.ok).toBe(false);
  });

  it('refuse une valeur calorique irréaliste', () => {
    const result = validateMeal({ label: 'Repas', caloriesKcal: MAX_CALORIES + 1 });
    expect(result.ok).toBe(false);
  });

  it('refuse Infinity sur une macro (pas seulement les calories)', () => {
    expect(validateMeal({ label: 'Repas', proteinG: Infinity }).ok).toBe(false);
  });

  it('refuse une macro au-delà de la borne réaliste', () => {
    expect(validateMeal({ label: 'Repas', carbsG: MAX_MACRO_G + 1 }).ok).toBe(false);
  });

  it('refuse un libellé visuellement vide (espace zéro-largeur)', () => {
    expect(validateMeal({ label: '\u200B' }).ok).toBe(false);
    expect(validateMeal({ label: '\uFEFF \u200D' }).ok).toBe(false);
  });

  it('refuse une incohérence grossière énergie<->macros (faute de frappe)', () => {
    // 40/50/15 g ≈ 495 kcal ; déclarer 1 kcal est incohérent.
    expect(validateMeal({ label: 'Bowl', caloriesKcal: 1, proteinG: 40, carbsG: 50, fatG: 15 }).ok).toBe(false);
  });

  it('n\'applique la cohérence que si tout est fourni (pas de faux positif)', () => {
    // calories seules, ou macros seules -> toujours accepté.
    expect(validateMeal({ label: 'Repas', caloriesKcal: 1 }).ok).toBe(true);
    expect(validateMeal({ label: 'Repas', proteinG: 40, carbsG: 50, fatG: 15 }).ok).toBe(true);
  });
});
