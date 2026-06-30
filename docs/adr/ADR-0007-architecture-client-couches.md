---
id: ADR-0007
title: Architecture client en couches (repositories + injection de dépendances)
status: accepted
date: 2026-06-30
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - architecture
  - client
  - testability
  - dependency-injection
  - clean-architecture
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase
  - ADR-0003  # Framework client — Expo/React Native
  - ADR-0004  # Isolation multi-tenant & RLS
  - ADR-0005  # Authentification & identité
  - ADR-0006  # Notifications push
---

# ADR-0007 — Architecture client en couches (repositories + DI)

## Contexte et énoncé du problème

Un principe est **verrouillé** depuis la vision et les ADR-0001/0003 : *la
présentation ne parle jamais à Supabase directement, toujours via une interface de
repository.* Objectifs : **testabilité** (tester la logique sans backend) et
**backend remplaçable** (changer Supabase ne doit pas toucher l'UI). Reste à poser
**l'architecture concrète** du client Expo/React Native : le découpage en couches et
le mécanisme d'**injection de dépendances** qui permet de substituer un repository
réel par un mock.

Le projet est porté par un **développeur solo** expert TypeScript/React. La solution
doit être **propre et testable** sans sur-ingénierie, et cohérente avec **Expo
Router** (routing par fichiers, ADR-0003).

## Décideurs et facteurs de décision

- **Inversion de dépendance** : la présentation dépend d'**interfaces**, pas
  d'implémentations ni du SDK Supabase.
- **Testabilité** : hooks/view-models testés contre des **repositories mockés**
  (confirmation promise par l'ADR-0003).
- **Backend remplaçable** : remplacer Supabase = réécrire `data/`, pas la
  présentation.
- **Simplicité solo** : éviter le sur-découpage (pas de DDD lourd, pas de container
  tiers à décorateurs si évitable).
- **Applicabilité automatique** : le principe doit être **vérifiable par lint**, pas
  seulement par discipline.

## Options considérées

1. **Couches `domain`/`data` + DI par React Context** : repositories définis comme
   **interfaces dans `domain/`**, implémentés dans `data/`, **injectés par un
   provider**.
2. **Couches + container DI tiers** (InversifyJS / tsyringe, décorateurs +
   `reflect-metadata`).
3. **Pas de couche d'abstraction** : la présentation appelle Supabase via des hooks
   directs (SDK / react-query branchés sur Supabase).
4. **Couches + service locator / singletons importés** (abstraction, mais sans
   injection explicite).

## Décision

Option retenue : **1 — Couches + DI par React Context.**

### Découpage en couches

```
app/      Routes Expo Router (écrans). Fines : appellent des hooks, zéro accès données.
ui/       Composants présentationnels réutilisables (design system). Aucune logique métier.
domain/   Cœur : entités/types métier, INTERFACES de repository (ports), use-cases purs
          (calcul du streak, règle de « journée parfaite »). Indépendant de tout framework.
data/     Implémentations concrètes des repositories (adapters) sur le SDK Supabase ;
          mapping DTO Supabase <-> entités domain. SEULE couche important @supabase/supabase-js.
core/     Transverse : client Supabase configuré, RepositoriesProvider (DI), config,
          secure storage, logger, gestion d'erreurs.
```

**Sens des dépendances** : `app`/`ui` → `domain` (interfaces) ← `data` (implémente).
`core` assure le câblage. La présentation **reçoit** les repositories par injection,
résolus vers `data` en production et vers des **mocks** en test.

### Injection de dépendances

Un `RepositoriesProvider` (React Context) expose les interfaces ; les écrans/hooks
consomment via un hook `useRepositories()` (ou `useFeedRepository()`…). En production,
le provider fournit les implémentations Supabase ; en test, on enveloppe l'arbre avec
des mocks. **Pas de container tiers** : le Context React suffit et reste idiomatique.

### Points complémentaires

- **Realtime** (feed) est encapsulé dans `data/` derrière l'interface (ex.
  `FeedRepository.subscribe(groupId, cb)`), jamais exposé brut à la présentation.
- **TanStack Query (react-query)** peut servir de cache/synchro **au-dessus** des
  repositories : les hooks de requête appellent les **interfaces**, pas Supabase — on
  bénéficie du cache sans percer l'abstraction.
- **Use-cases** : la logique métier transverse (streak, journée parfaite) vit dans
  `domain/` ; elle peut rester légère au MVP tant que la frontière `domain`/`data`
  tient.
- **Règle de lint** : `no-restricted-imports` interdit `@supabase/supabase-js` hors
  de `data/` (et du client dans `core/`) — le principe verrouillé devient
  **automatiquement vérifiable**.

## Conséquences

### Positives

- **Testabilité réelle** : view-models/hooks testés en injectant des mocks, sans
  backend.
- **Backend remplaçable** : changer Supabase n'impacte que `data/`.
- **Séparation claire** et cohérente avec Expo Router ; modèle mental familier
  (TS/React).
- Le principe « pas de Supabase dans la présentation » est **appliqué par lint**, pas
  par bonne volonté.

### Négatives

- Un peu de **boilerplate** (interface + implémentation + mapping + provider).
- **Discipline** requise pour ne pas court-circuiter la frontière.
- Le **mapping DTO ↔ domain** a un coût d'écriture.

### Neutres

- **react-query** est optionnel : un confort de cache au-dessus des repositories, pas
  une obligation.
- Le **Context React** suffit ; aucun container DI tiers n'est nécessaire à cette
  échelle.
- La couche **use-cases** peut démarrer minimale et s'étoffer.

## Confirmation

- **Aucun import** de `@supabase/supabase-js` hors `data/` (client dans `core/`),
  garanti par **lint** + revue d'architecture.
- Les repositories sont des **interfaces dans `domain/`**, implémentées dans `data/`.
- Les **hooks/view-models sont testés** contre des repositories mockés injectés.
- Un **build Android** reste produisible (rappel ADR-0003) : l'architecture
  n'introduit rien de spécifique à iOS.

## Avantages et inconvénients des options

### Option 1 — Couches + DI par React Context (retenue)

- Bon : idiomatique React, testable, simple, **aucune dépendance tierce** ; lint
  applicable.
- Mauvais : un peu de boilerplate (provider + interfaces + mapping).

### Option 2 — Container DI tiers (InversifyJS/tsyringe)

- Bon : résolution puissante, scopes, cycle de vie.
- Mauvais : décorateurs + `reflect-metadata`, dépendance et complexité **non
  justifiées** à cette taille ; courbe pour un bénéfice marginal.

### Option 3 — Pas d'abstraction (Supabase direct dans la présentation)

- Bon : le moins de code, démarrage immédiat.
- Mauvais : **viole le principe verrouillé** ; présentation **non testable** sans
  backend ; **backend non remplaçable**. Rédhibitoire.

### Option 4 — Service locator / singletons importés

- Bon : pas de provider à câbler.
- Mauvais : **couplage caché**, mock global fragile, dépendance à l'ordre d'init ;
  moins testable que l'injection explicite.

## Pour aller plus loin

- ADR-0001 / ADR-0003 — Le principe (présentation → interfaces, jamais Supabase) que
  cette architecture concrétise.
- ADR-0004 / ADR-0005 / ADR-0006 — Les repositories concrets (données de groupe,
  `AuthRepository`, `NotificationRepository`) vivent dans `data/`, derrière des
  interfaces `domain/`.
- Arbo de référence du scaffold : `app/`, `ui/`, `domain/`, `data/`, `core/`, avec un
  premier repository mocké et son test.
