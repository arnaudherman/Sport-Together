---
id: ADR-0002
title: Modèle de feed polymorphe (table FEED_ITEMS + tables de détail)
status: accepted
date: 2026-06-25
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - data-model
  - database
  - schema
  - extensibility
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase
  - ADR-0003  # Framework client — Expo/React Native
---

# ADR-0002 — Modèle de feed polymorphe (`FEED_ITEMS`)

## Contexte et énoncé du problème

Le feed est le cœur du produit. Au MVP, il contient des **séances**. Mais la
feuille de route prévoit d'y faire apparaître d'autres types de contenu :
suivi de mesures personnelles (Phase 3) et repas/photos (Phase 4). En parallèle,
plusieurs logiques transversales s'appliquent **uniformément à toute entrée du
feed**, quel que soit son type : les réactions, le tri chronologique, les
notifications, et le calcul du streak de groupe.

Le problème : comment modéliser le feed pour que l'ajout de nouveaux types de
contenu soit **additif** (aucune migration douloureuse du schéma existant) tout en
gardant la logique transversale simple et unique ?

## Décideurs et facteurs de décision

- **Extensibilité additive** : ajouter un type de contenu ne doit pas casser ni
  remanier l'existant.
- **Logique transversale unique** : réactions, tri, notifications, streak doivent
  s'écrire une seule fois pour tous les types.
- **Intégrité relationnelle** et requêtes simples.
- **Lisibilité** pour un développeur solo (éviter la sur-ingénierie).

## Options considérées

1. **Table générique `FEED_ITEMS`** (avec discriminateur `type`) **+ une table de
   détail par type** (`SESSIONS`, puis `WEIGH_INS`, `MEALS`…).
2. **Table large unique** : une seule table avec toutes les colonnes possibles,
   nullables selon le type.
3. **Tables séparées sans colonne vertébrale** : le feed est reconstitué par une
   union applicative de `SESSIONS`, `WEIGH_INS`, etc.
4. **Event sourcing** : journal d'événements immuable, feed projeté depuis le log.

## Décision

Option retenue : **1 — `FEED_ITEMS` générique + tables de détail.**

`FEED_ITEMS` porte les attributs communs à toute entrée (id, `group_id`,
`author_id`, `type`, `created_at`) et sert de point d'ancrage unique pour les
réactions, le tri, les notifications et le streak. Chaque type a sa table de
détail reliée par clé étrangère (`SESSIONS.feed_item_id` aujourd'hui). Ajouter les
pesées ou les repas en Phase 3/4 consiste à créer une nouvelle table de détail et
une nouvelle valeur de `type` : **le feed, les réactions, les notifications et le
streak continuent de fonctionner sans modification**. Les phases suivantes
deviennent des ajouts, pas des migrations.

## Conséquences

### Positives

- Extensibilité **additive** : nouveaux types = nouvelles tables, sans toucher
  l'existant.
- Logique transversale (réactions, tri, notifs, streak) écrite **une seule fois**
  contre `FEED_ITEMS`.
- Tables de détail propres et typées, sans colonnes nullables fourre-tout.
- Intégrité référentielle naturelle via clés étrangères.

### Négatives

- Lire une entrée complète demande une **jointure** entre `FEED_ITEMS` et la table
  de détail (coût modéré, indexable).
- Le discriminateur `type` doit rester cohérent entre la base et le code client.

### Neutres

- Le modèle reste un compromis pragmatique (class-table inheritance), ni aussi
  rigide qu'une table large, ni aussi lourd qu'un event sourcing.

## Confirmation

- Toute nouvelle catégorie de contenu du feed est introduite via une table de
  détail reliée à `FEED_ITEMS`, jamais en élargissant une table existante.
- Réactions, notifications et streak référencent `feed_item_id`, jamais une table
  de détail spécifique.

## Avantages et inconvénients des options

### Option 1 — `FEED_ITEMS` + tables de détail (retenue)

- Bon : extensibilité additive ; logique transversale unique ; tables propres ;
  intégrité relationnelle.
- Mauvais : une jointure par lecture complète ; cohérence du discriminateur à
  maintenir.

### Option 2 — Table large unique (colonnes nullables)

- Bon : pas de jointure, lecture directe.
- Mauvais : prolifération de colonnes nullables à chaque nouveau type ; schéma de
  plus en plus illisible ; contraintes d'intégrité difficiles à exprimer.

### Option 3 — Tables séparées, union applicative

- Bon : chaque type totalement indépendant.
- Mauvais : réactions, tri, notifications et streak doivent gérer chaque type
  séparément ; la logique transversale se duplique à chaque ajout — l'inverse de
  l'objectif.

### Option 4 — Event sourcing

- Bon : historique complet et auditable ; très flexible.
- Mauvais : sur-ingénierie manifeste pour un MVP solo ; complexité de projection et
  de cohérence injustifiée à ce stade.

## Pour aller plus loin

- ADR-0001 — Backend Supabase (PostgreSQL) qui héberge ce schéma.
- Schéma de référence du noyau : `USERS`, `GROUPS`, `MEMBERSHIPS`, `FEED_ITEMS`,
  `SESSIONS`, `REACTIONS`.
- Extensions prévues sans migration : `WEIGH_INS` (Phase 3), `MEALS` (Phase 4),
  reliées à `FEED_ITEMS`.
