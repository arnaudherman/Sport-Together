import { describe, expect, it } from '@jest/globals';

import { MAX_CALORIES, validateMeal } from '@/domain/usecases/nutrition';

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
});
