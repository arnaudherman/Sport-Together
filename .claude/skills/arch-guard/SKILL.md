---
name: arch-guard
description: Relit le diff de travail courant contre les contraintes verrouillées de Sport Together (les ADR) — couches, isolation RLS, garde-fous nutrition & streak. À utiliser après avoir écrit du code et avant de committer, pour attraper toute violation des invariants d'architecture et de produit.
---

# Garde architecture & produit — Sport Together

Relire le diff de travail (`git diff` + fichiers nouveaux) contre ces contraintes
**NON NÉGOCIABLES**. Pour chaque violation : `fichier:ligne` + correctif concret.
S'il n'y a aucune violation, répondre « conforme ».

## Couches (ADR-0007)
- `@supabase/supabase-js` n'est importé QUE dans `data/**` et `core/supabase/**`.
  Jamais dans `app/`, `ui/`, `domain/`, `core/di`.
- Les repositories sont des **interfaces** dans `domain/repositories/`, implémentés
  dans `data/`. La présentation dépend des interfaces via le provider DI
  (`useXRepository()`), jamais d'une classe concrète.
- `domain/` est **pur** : pas de React, pas de React Native, pas de SDK.

## Isolation multi-tenant (ADR-0004) — pour tout changement SQL / migration
- Chaque table de groupe a la RLS activée et une politique testée.
- Chaque `with check` d'écriture exige `is_group_member(group_id)`.
- `memberships` n'a **aucune** politique d'INSERT directe — l'adhésion passe par les
  RPC `create_group` / `join_group_by_code` uniquement.
- Le `group_id` dénormalisé des tables de détail reste cohérent avec le parent
  (FK composite + trigger de synchro).

## Garde-fous nutrition (ADR-0008)
- **Aucune** colonne/objectif de poids. Aucun déficit/cible calorique permettant un
  classement.
- **Aucun** endpoint / vue / écran qui compare ou classe les calories des membres.
- Cadrage **positif** (jamais « tu as dépassé ») ; app réservée aux adultes.

## Streak & nudge (vision §3, §8)
- Le streak personnel est **non punitif** : jours de repos et activités douces ne le
  cassent pas.
- **Aucune** mécanique où un membre fait « perdre » le groupe. Les relances sont du
  soutien, jamais du blâme.

## Tests
- Toute nouvelle logique de `domain/` est livrée avec des tests unitaires.
