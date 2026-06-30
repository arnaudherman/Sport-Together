---
name: quality-gate
description: Lance le contrôle qualité de Sport Together (typecheck + tests + lint, et bundle Metro si l'UI/navigation change). À utiliser après toute modification de code et AVANT chaque commit. Ne jamais committer si le gate n'est pas vert.
---

# Quality gate — Sport Together

Depuis la racine du dépôt, exécuter dans l'ordre et rapporter chaque résultat :

1. `npm run typecheck` — TypeScript, **0 erreur** exigée.
2. `npm test` — Jest, **tout au vert**.
3. `npm run lint` — ESLint, incluant la règle `no-restricted-imports` qui interdit
   `@supabase/supabase-js` hors de `data/` et `core/supabase/` (ADR-0007).

Si une étape échoue : **corriger la cause** (ne jamais désactiver/contourner le
contrôle), puis relancer. Ne déclarer **GREEN** que si les trois passent.

Pour tout changement touchant la navigation, le DI, ou le câblage d'écrans, lancer
aussi `npx expo export --platform ios` pour confirmer que **Metro bundle** sans erreur.

Toute nouvelle logique métier dans `domain/` doit être accompagnée de tests unitaires.
