/**
 * Saisie d'un repas (ADR-0008). GARDE-FOUS STRUCTURELS : on ne stocke que les
 * valeurs intrinsèques du repas. AUCUN champ de poids, AUCUNE cible/déficit
 * calorique — l'absence est volontaire et fait partie de la sécurité (anti-TCA).
 */
export type MealMoment = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealInput {
  label: string;
  moment?: MealMoment;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}
