import type { MealInput } from '@/domain/entities/meal';

/**
 * Validation d'un repas (ADR-0008). Logique pure, testable. On valide des plages
 * SAINES (valeurs positives, calories réalistes) sans jamais juger ni cibler :
 * pas de notion de « dépassement », pas d'objectif, pas de poids. Le cadrage
 * reste positif (anti-TCA). C'est un complément applicatif aux CHECK de la base.
 */
export const MAX_CALORIES = 20000;

export type MealValidation = { ok: true } | { ok: false; error: string };

export function validateMeal(input: MealInput): MealValidation {
  const label = input.label.trim();
  if (label.length === 0) return { ok: false, error: 'Donne un nom au repas.' };
  if (label.length > 80) return { ok: false, error: 'Nom trop long (80 caractères max).' };

  const numbers: [string, number | undefined][] = [
    ['calories', input.caloriesKcal],
    ['protéines', input.proteinG],
    ['glucides', input.carbsG],
    ['lipides', input.fatG],
  ];
  for (const [name, value] of numbers) {
    if (value != null && (Number.isNaN(value) || value < 0)) {
      return { ok: false, error: `Valeur de ${name} invalide.` };
    }
  }

  if (input.caloriesKcal != null && input.caloriesKcal > MAX_CALORIES) {
    return { ok: false, error: 'Cette valeur calorique semble irréaliste.' };
  }

  return { ok: true };
}
