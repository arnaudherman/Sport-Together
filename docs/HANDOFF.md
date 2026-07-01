# Reprise de projet — Sport Together

> À lire en premier dans une nouvelle session. Pour le détail : `docs/VISION-ET-CADRAGE.md`
> (cible), `docs/adr/` (décisions), `docs/CHANGELOG.md` (ce qui est fait), `docs/BACKLOG.md`
> (ce qui reste). En cas de doute, **le code fait foi** — ce brief peut dater.

## En une phrase

App mobile de **self-improvement solo-first** : chacun logge sa progression (séances, pas,
repas) sous forme de **fil social type Twitter**, gagne de l'XP / des niveaux / un arbre de
compétences, et peut **optionnellement** rejoindre des **groupes privés d'entraide**.
L'individu est au cœur ; le groupe est un **add-on**, jamais un prérequis (ADR-0010).

## Où on en est

**Phase 1 — construction (mode mock avancé, backend prouvé localement).**

- **Front** (Expo/RN, iOS-first, mode mock = faux user) : accueil = fil social (onglets
  Tout / Abonnements / Groupes) avec en-tête gamifié (niveau/XP/streak) ; publier une
  séance/pas/repas ; profil à onglets (Publications / Compétences = holy graph / Médias) ;
  suivre / se désabonner ; **Découvrir** des gens ; commenter ; supprimer ses posts ;
  éditer son profil (pseudo + bio) ; écran Compte (déconnexion / suppression) ; groupes
  d'entraide en add-on.
- **Backend** (Supabase) : 13 migrations, prouvé de bout en bout sur un Postgres local —
  **harnais RLS 16/16** (isolation multi-tenant + visibilité des abonnements) + e2e.
- **Qualité** : `tsc`/`lint` à zéro, ~44 tests front, archi en couches (ADR-0007)
  verrouillée par ESLint. `npm run check` = lint + typecheck + test.

## Décisions structurantes (voir `docs/adr/`)

1. **Supabase** (PostgreSQL + Auth + Realtime + Storage + RLS) — ADR-0001.
2. **Feed polymorphe** `feed_items` + tables de détail (`sessions`/`step_logs`/`meals`) — ADR-0002.
3. **Expo / React Native, iOS-first** — ADR-0003.
4. **Multi-tenant par RLS** (isolation par groupe, adhésion via RPC) — ADR-0004.
5. **Archi client en couches** (domain pur → data ← ui + core/DI) — ADR-0007.
6. **Gamification non-compétitive** (progression perso + entraide, pas de classement) — ADR-0009.
7. **Pivot solo-first** (accueil = fil social, groupes = add-on privé) — ADR-0010.

## La boucle d'engagement (cœur du produit)

Logger sa progression (5 s) → le post apparaît dans son fil + gagne de l'XP → niveau / arbre
de compétences qui avance → abonnements et groupes d'entraide amplifient → (retour demain).

## Ce qui reste (voir `docs/BACKLOG.md`)

- **Besoin de ton environnement** : déployer le Supabase cloud, notifications push (device),
  temps réel, **timeline perso** (publier « solo » sans groupe côté serveur).
- **Profondeur produit** : célébration de level-up / palier, quêtes hebdo, vraie
  progression du holy graph (DAG), quêtes d'entraide, photos sur les posts.

## Conventions

- Commits : `feat(feed): …`, `fix(review): …`, `docs(adr): …`.
- Format ADR : MADR (front matter YAML) — voir ADR-0003 comme gabarit.
- Archi : la présentation dépend d'**interfaces de repository**, jamais de Supabase
  directement (règle ESLint `no-restricted-imports`).

## Garde-fous produit (non négociables)

- Pas de dérive nutrition / coaching diététique ; nudge bienveillant, jamais punitif ;
  **aucun objectif de poids**, aucun classement compétitif entre membres.
