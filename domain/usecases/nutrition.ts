import type { MealInput } from '@/domain/entities/meal';

/**
 * Validation d'un repas (ADR-0008). Logique pure, testable. On valide des plages
 * SAINES (valeurs positives, calories réalistes) sans jamais juger ni cibler :
 * pas de notion de « dépassement », pas d'objectif, pas de poids. Le cadrage
 * reste positif (anti-TCA). C'est un complément applicatif aux CHECK de la base.
 */
export const MAX_CALORIES = 20000;
export const MAX_MACRO_G = 500; // borne PAR REPAS réaliste : attrape les fautes de frappe (500->5000)

export type MealValidation = { ok: true } | { ok: false; error: string };

export function validateMeal(input: MealInput): MealValidation {
  // Retire les espaces zéro-largeur (String.trim ne les enlève pas) puis exige au
  // moins un caractère visible : un libellé « vide » invisible est refusé.
  const label = input.label.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim();
  if (!/[\p{L}\p{N}]/u.test(label)) return { ok: false, error: 'Donne un nom au repas.' };
  if (label.length > 80) return { ok: false, error: 'Nom trop long (80 caractères max).' };

  const macros: [string, number | undefined][] = [
    ['protéines', input.proteinG],
    ['glucides', input.carbsG],
    ['lipides', input.fatG],
  ];
  const all: [string, number | undefined][] = [['calories', input.caloriesKcal], ...macros];

  // Rejette NaN ET ±Infinity (Number.isFinite couvre les deux) et le négatif.
  for (const [name, value] of all) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      return { ok: false, error: `Valeur de ${name} invalide.` };
    }
  }

  // Bornes hautes réalistes (alignées sur le schéma), cadrage neutre (anti-TCA).
  if (input.caloriesKcal != null && input.caloriesKcal > MAX_CALORIES) {
    return { ok: false, error: 'Cette valeur calorique semble irréaliste.' };
  }
  for (const [name, value] of macros) {
    if (value != null && value > MAX_MACRO_G) {
      return { ok: false, error: `Cette valeur de ${name} semble irréaliste.` };
    }
  }

  // Cohérence souple énergie<->macros, UNIQUEMENT si tout est fourni (sinon on n'invente
  // rien) : ~4 kcal/g glucides & protéines, ~9 kcal/g lipides. Tolérance ±40 % pour ne
  // pas faux-positiver sur des arrondis ; attrape surtout les fautes de frappe.
  const { caloriesKcal, proteinG, carbsG, fatG } = input;
  if (caloriesKcal != null && proteinG != null && carbsG != null && fatG != null) {
    const fromMacros = 4 * proteinG + 4 * carbsG + 9 * fatG;
    const ref = Math.max(caloriesKcal, fromMacros);
    if (ref > 0 && Math.abs(caloriesKcal - fromMacros) > 0.4 * ref) {
      return { ok: false, error: 'Les valeurs ne semblent pas cohérentes, revérifie.' };
    }
  }

  return { ok: true };
}
