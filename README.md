# Sport Together

App mobile de **self-improvement solo-first** : chacun logge sa progression (séances,
pas, repas) dans un **fil social type Twitter**, gagne de l'XP / des niveaux / un **arbre
de compétences**, et peut **optionnellement** rejoindre des **groupes privés d'entraide**.
L'individu est au cœur ; le groupe est un add-on, jamais un prérequis (ADR-0010).

> **Statut : Phase 1 — MVP en construction (solo-first).** Cadrage figé (vision v2.0 +
> 10 ADR), archi Expo en couches, **boucle sociale complète en mock** et **backend prouvé
> localement** (harnais RLS 16/16).

## Documentation

- [`docs/VISION-ET-CADRAGE.md`](docs/VISION-ET-CADRAGE.md) — vision, scope du MVP
  (DEDANS / DEHORS), définition de « ça marche ».
- [`docs/adr/`](docs/adr) — Architecture Decision Records (ADR-0001 à 0010).
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — brief de reprise (état réel, solo-first).
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) / [`docs/BACKLOG.md`](docs/BACKLOG.md) — fait / reste à faire.
- [`supabase/README.md`](supabase/README.md) — schéma, migrations, application.

## Stack

- **Client** : Expo / React Native (SDK 56), Expo Router, TypeScript, iOS-first.
- **Backend** : Supabase — PostgreSQL, Auth, Storage, Row Level Security.
- **Architecture** (ADR-0007) : `app/` → `ui/` → `domain/` (interfaces) ← `data/`
  (impl Supabase), `core/` (DI + client). La présentation ne parle jamais à
  Supabase directement — garanti par ESLint.

## Lancer l'app

**Mode hors-ligne (mock, sans backend)** — pour voir l'UI tout de suite :

```bash
npm install
npx expo start   # puis « i » pour le simulateur iOS
```

N'importe quel e-mail + code te connecte (mock) : tu publies des séances, tu suis des
gens, tu commentes, tu vois ta progression (XP / niveau / arbre de compétences) et tu
peux rejoindre un groupe d'entraide — tout fonctionne sur des données en mémoire.

**Mode Supabase (vraies données)** :

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Applique les migrations de `supabase/migrations/` (voir `supabase/README.md`).
3. Active le provider **Email** (magic link) ; pour le flux par code, ajoute
   `{{ .Token }}` au template e-mail Magic Link.
4. `cp .env.example .env` et renseigne `EXPO_PUBLIC_SUPABASE_URL` +
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. `npx expo start`.

## Qualité

```bash
npm run check       # lint + typecheck + test (gate agrégé)
npm run typecheck   # tsc --noEmit
npm test            # jest
npm run lint        # eslint (incl. frontière de couches ADR-0007)
npm run test:db     # harnais RLS/RPC sur Postgres jetable (16 tests)
```

Le même triptyque tourne en CI (`.github/workflows/ci.yml`). Skills de garde-fou
dans `.claude/skills/` (`quality-gate`, `arch-guard`).

## Avancement (Phase 1, solo-first)

| Fait | Reste |
|------|-------|
| Accueil = **fil social** (Tout / Abonnements / Groupes) + en-tête gamifié | Célébration de level-up / palier, quêtes hebdo |
| **Publier** séance / pas / repas (garde-fous nutrition) + XP | Photos de séance, **timeline perso** backend |
| **Abonnements** (suivre/désabonner) + **Découvrir** + visibilité RLS (16/16) | Notifications push (ADR-0006), temps réel |
| **Commentaires**, réactions (optimistes), supprimer ses posts | — |
| Profil à onglets (Publications / **holy graph** / Médias), édition pseudo + bio | Vraie progression DAG de l'arbre, autres arbres |
| **Groupes** d'entraide en add-on (créer / rejoindre par code) | Sélecteur multi-groupes, quêtes d'entraide réelles |
| Écran **Compte** (déconnexion / suppression), onboarding | Sign in with Apple (ADR-0005) |
| RLS multi-tenant + abonnements (harnais **16/16**), RPC atomiques | Déploiement Supabase cloud |
