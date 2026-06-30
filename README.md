# Sport Together

App sociale de motivation sportive : des **groupes fermés d'amis** se suivent et
se poussent à faire du sport (et, à terme, à mieux manger). La motivation
individuelle est fragile ; l'engagement envers un groupe l'est beaucoup moins.

> **Statut : Phase 1 — MVP en construction.** Cadrage figé (vision v1.0 + 8 ADR),
> scaffold Expo en couches, et premières features de la boucle core en place.

## Documentation

- [`docs/VISION-ET-CADRAGE.md`](docs/VISION-ET-CADRAGE.md) — vision, scope du MVP
  (DEDANS / DEHORS), définition de « ça marche ».
- [`docs/adr/`](docs/adr) — Architecture Decision Records (ADR-0001 à 0008).
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — brief de reprise.
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

N'importe quel e-mail + code te connecte (mock), tu crées un groupe, tu logges
des goals, tu réagis : tout fonctionne sur des données en mémoire.

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
npm run typecheck   # tsc --noEmit
npm test            # jest
npm run lint        # eslint (incl. frontière de couches ADR-0007)
```

Le même triptyque tourne en CI (`.github/workflows/ci.yml`). Skills de garde-fou
dans `.claude/skills/` (`quality-gate`, `arch-guard`).

## Avancement (Phase 1)

| Fait | Reste |
|------|-------|
| Auth magic link (code OTP) | Sign in with Apple (ADR-0005) |
| Groupes : créer / rejoindre par code | Liste / sélecteur multi-groupes |
| Log d'un goal : séance / pas / repas (garde-fous nutrition) | Photos de séance |
| Feed du groupe + réactions (kudos / encouragement) | Notifications push (ADR-0006) |
| Streak personnel (moteur testé + affichage) | Journée parfaite collective (UI), jours de repos |
| RLS multi-tenant (revue sécurité), RPC atomiques | Onboarding profil, suppression de compte |
