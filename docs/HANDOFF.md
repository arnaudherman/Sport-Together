# Reprise de projet — Sport Together

> À lire en premier dans une nouvelle session (Claude Code). Ce brief contient
> tout le contexte nécessaire pour reprendre sans la conversation d'origine.

## En une phrase

App mobile sociale de motivation sportive : des groupes fermés d'amis suivent le
sport de chacun et se poussent mutuellement. L'unité de valeur est **le groupe**,
jamais l'individu seul.

## Où on en est

**Phase 0 — cadrage.** On fige la cible *avant* de coder. Le document
`docs/VISION-ET-CADRAGE.md` (v0.1) est un brouillon à challenger, en particulier :

- la section **7 (scope MVP DEDANS / DEHORS)** ;
- l'**identité** : Sign in with Apple seul au départ, ou aussi e-mail / magic link ?

Tant que la cible n'est pas validée par le porteur, **on ne rédige pas les ADR
restants et on ne code pas**.

## Décisions déjà verrouillées (portes à sens unique)

1. **Backend : Supabase** (PostgreSQL + Auth + Realtime + Storage + RLS).
   → garantit l'interop iOS ↔ Android (les deux clients tapent le même schéma).
2. **Modèle de feed polymorphe** : table `FEED_ITEMS` (avec discriminateur `type`)
   + tables de détail (`SESSIONS` aujourd'hui ; `WEIGH_INS`, `MEALS` plus tard sans
   migration).
3. **Client : Expo / React Native, iOS-first** (Android certain mais post-validation).
   → voir `docs/adr/ADR-0003-framework-client-mobile.md`.

## La boucle d'engagement (cœur du produit)

Séance loggée (5 s) → les potes la voient → réactions (kudos / nudge) → le streak
de **groupe** avance → envie de bouger demain → (retour). Aucune feature n'est
ajoutée tant que cette boucle n'est pas fluide.

## Prochaines étapes, dans l'ordre

1. **Peaufiner la cible** avec le porteur (scope MVP, identité) → passer v0.1 en v1.0.
2. **Rédiger les 7 ADR** du registre (voir `VISION-ET-CADRAGE.md` §11) :
   - ADR-0001 Backend Supabase (fait)
   - ADR-0002 Feed polymorphe (fait)
   - ADR-0003 Client Expo (fait)
   - ADR-0004 Multi-tenant & RLS
   - ADR-0005 Auth & identité
   - ADR-0006 Notifications push (Expo Notifications)
   - ADR-0007 Architecture client en couches (repositories + DI)
3. **Mettre en place le dépôt** : commits des docs, conventions.
4. **Scaffolder** l'arbo Expo (`app/`, `domain/`, `data/`, `core/`, `ui/`) avec un
   premier repository mocké et un test, *puis* les features du MVP.

## Conventions

- Commits : `docs(adr): ADR-0004 isolation multi-tenant`, `feat(feed): log de séance`.
- Format ADR : MADR avec front matter YAML (voir ADR-0003 comme gabarit).
- Principe d'archi : la présentation dépend d'interfaces de repository, jamais de
  Supabase directement (testabilité, backend remplaçable).

## Garde-fous produit

- Ne pas dériver vers une app de nutrition / coaching diététique.
- Nudge bienveillant, jamais punitif ; pas d'objectifs de poids agressifs.
- Ne pas ajouter de feature avant que la boucle core soit prouvée sur le groupe
  fondateur.
