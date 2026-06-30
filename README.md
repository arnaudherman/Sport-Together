# Sport Together

App sociale de motivation sportive : des **groupes fermés d'amis** se suivent et
se poussent à faire du sport. La motivation individuelle est fragile ;
l'engagement envers un groupe l'est beaucoup moins.

> **Statut : cadrage (Phase 0).** Pas encore de code — on fige la cible et les
> décisions d'architecture avant d'écrire la moindre ligne.

## Documentation

- [`docs/VISION-ET-CADRAGE.md`](docs/VISION-ET-CADRAGE.md) — vision, utilisateurs,
  scope du MVP (DEDANS / DEHORS), définition de « ça marche ».
- [`docs/adr/`](docs/adr) — Architecture Decision Records.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — brief de reprise (lis-le en premier dans
  Claude Code).

## Stack cible

- **Client** : Expo / React Native (New Architecture), iOS-first, Android-ready.
- **Backend** : Supabase — PostgreSQL, Auth (Sign in with Apple), Realtime,
  Storage, Row Level Security.
- **Architecture** : présentation → repositories (interfaces) → data → Supabase.
  La présentation ne parle jamais au backend directement.

## Plan de travail

1. **Phase 0 — Cible.** Valider `VISION-ET-CADRAGE.md` (en cours).
2. **Phase 1 — ADR.** Rédiger les 7 ADR du registre.
3. **Phase 2 — Repo & Git.** Structure docs, commits, conventions.
4. **Phase 3 — Code.** Scaffold Expo puis features du MVP.
