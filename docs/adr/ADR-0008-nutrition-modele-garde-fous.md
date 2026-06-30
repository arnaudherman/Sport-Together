---
id: ADR-0008
title: Nutrition — modèle de données & garde-fous de sécurité
status: accepted
date: 2026-06-30
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - nutrition
  - data-model
  - safety
  - well-being
  - schema
supersedes: []
superseded-by: []
related:
  - ADR-0002  # Modèle de feed polymorphe
  - ADR-0004  # Isolation multi-tenant & RLS
  - ADR-0006  # Notifications push
---

# ADR-0008 — Nutrition : modèle de données & garde-fous

## Contexte et énoncé du problème

La vision v1.0 acte une décision structurante et **délibérément à contre-courant**
d'un anti-objectif initial : le suivi **nutrition chiffré (calories / macros)** entre
dans le périmètre **dès le MVP**. Cette réouverture du garde-fou « pas de dérive
nutrition » n'a été retenue qu'**à la condition stricte** d'encadrer le risque (voir
vision §8). Cet ADR fixe donc **deux choses indissociables** :

1. **Le modèle de données** de la nutrition, intégré proprement au reste.
2. **Les garde-fous de sécurité**, inscrits autant que possible **dans le schéma et
   l'API**, pas seulement dans l'intention.

Le risque est réel et documenté : **calories chiffrées + objectif quotidien +
comparaison sociale** est le principal vecteur des troubles du comportement
alimentaire (TCA). La mécanique de relance quotidienne du produit amplifierait ce
risque si elle s'appliquait sans précaution à l'assiette. Le rôle de cet ADR est de
rendre cette dérive **structurellement difficile**.

## Décideurs et facteurs de décision

- **Additivité** : la nutrition doit s'ajouter sans migration ni refonte (cohérence
  ADR-0002).
- **Confidentialité** : donnée sensible → RLS par groupe (ADR-0004), et **aucun
  classement** entre membres.
- **Garde-fous TCA structurels** : le modèle lui-même doit empêcher les usages
  toxiques (pas de champ de poids, pas de comparatif calorique exposé).
- **Démarrage léger** : saisie manuelle assistée, sans base alimentaire complète ni
  scan dès le premier jet.
- **Friction maîtrisée** : la nutrition ne doit pas alourdir le log au point de
  casser la boucle core.

## Options considérées

1. **Repas = nouveau type du feed polymorphe + table de détail `MEALS`
   (kcal/macros), saisie manuelle assistée d'une liste `FOODS`, garde-fous inscrits
   dans le modèle et l'UX.**
2. **Intégration d'une API nutritionnelle tierce** (Open Food Facts / Nutritionix…)
   dès le MVP pour des calories automatiques.
3. **Table nutrition séparée du feed** (les repas ne sont pas des `feed_items`),
   recomposée par union applicative.
4. **Suivi nutrition sans chiffres** (habitudes positives uniquement, sans
   calories/macros).

## Décision

Option retenue : **1 — Repas dans le feed polymorphe + table `MEALS`, saisie manuelle
assistée, garde-fous structurels.**

### Modèle de données

- Un repas est un **`feed_item` de type `meal`** + une table de détail **`MEALS`**
  (`feed_item_id` FK, `group_id` **dénormalisé** pour la RLS, auteur porté par le
  `feed_item`). Conforme à l'ADR-0002 : ajout **purement additif**, réactions / tri /
  notifications / streak continuent de fonctionner sans modification.
- `MEALS` porte : libellé, **`calories_kcal`**, **`proteines_g`**, **`glucides_g`**,
  **`lipides_g`**, moment (petit-déj / déj / dîner / collation, optionnel), **photo**
  optionnelle (Storage, ADR-0004).
- **Saisie manuelle au MVP**, assistée d'une liste d'aliments réutilisable **`FOODS`**
  (nom + valeurs nutritionnelles par portion) qui **s'enrichit** à l'usage. La base
  alimentaire externe et le **scan code-barres** sont des **enrichissements
  ultérieurs**, pas un prérequis (note d'implémentation de la vision).

### Garde-fous de sécurité (contraignants)

- **Aucun champ de poids** dans le modèle nutrition ; **aucun objectif de déficit**
  stocké. Les mesures personnelles (Phase 3) restent une fonctionnalité **séparée**,
  jamais couplée à une cible calorique.
- **Aucun classement ni comparaison chiffrée des calories entre membres** : aucune
  route, vue ou requête n'expose un « qui mange le moins ». Le feed montre **qu'un
  repas a été loggé**, la gamification nutrition porte sur la **régularité du log**,
  jamais sur les valeurs comparées.
- **Cadrage anti-TCA dans l'UX** : langage positif, **jamais** « tu as dépassé »,
  pas d'alerte culpabilisante ni de signal punitif ; accès à des ressources d'aide.
- **Réservé aux adultes** (age-gating à l'inscription).
- **La relance quotidienne ne porte aucun jugement sur les quantités
  nutritionnelles** : on peut célébrer le fait d'avoir loggé, on ne « nudge » jamais
  négativement sur ce qui est mangé.

## Conséquences

### Positives

- Nutrition **additive** : aucune migration, mêmes réactions / notifs / RLS que le
  reste du feed.
- **Garde-fous en partie structurels** (absence de champ de poids, absence d'endpoint
  de classement) : la dérive toxique devient difficile, pas seulement déconseillée.
- **Démarrage léger** possible (saisie manuelle + `FOODS`), enrichissable plus tard.

### Négatives

- **Scope MVP alourdi** (saisie de repas, gestion de `FOODS`).
- **Risque TCA réel** que les garde-fous **atténuent sans annuler** — à **surveiller
  activement** pendant la validation.
- Saisie manuelle de macros **fastidieuse** : tension avec « logger en quelques
  secondes » → l'UX de saisie devra être particulièrement soignée.
- **Responsabilité accrue** : données de santé sensibles, catégorie App Store
  « santé » plus scrutée.

### Neutres

- Base d'aliments externe + scan = **enrichissement futur** sans rupture de modèle.
- Des objectifs nutritionnels **informatifs** (jamais des cibles de perte) restent
  possibles plus tard, sous les mêmes garde-fous.

## Confirmation

- `MEALS` est une **table de détail reliée à `FEED_ITEMS`** (jamais un élargissement
  d'une table existante), `group_id` dénormalisé **sous RLS** (ADR-0004).
- **Aucun champ de poids** ni objectif de déficit dans le modèle ; **aucun endpoint /
  vue n'expose un comparatif calorique** entre membres — vérifié par test.
- L'UX nutrition respecte le **cadrage anti-TCA** (langage positif, pas d'alerte
  culpabilisante) ; **age-gating adulte** à l'inscription.
- La **relance quotidienne** ne porte pas de jugement sur les quantités
  nutritionnelles.

## Avantages et inconvénients des options

### Option 1 — Feed polymorphe + `MEALS` + garde-fous structurels (retenue)

- Bon : additif (ADR-0002), même logique transversale, garde-fous en partie inscrits
  dans le schéma, démarrage léger.
- Mauvais : scope alourdi ; risque TCA à surveiller ; saisie manuelle fastidieuse.

### Option 2 — API nutritionnelle tierce dès le MVP

- Bon : calories « automatiques », moins de saisie.
- Mauvais : dépendance externe, qualité/couverture variable, complexité et coût
  prématurés ; n'enlève pas le risque TCA. Mieux en **enrichissement** ultérieur.

### Option 3 — Table nutrition séparée du feed

- Bon : isolement du domaine nutrition.
- Mauvais : oblige à **dupliquer** réactions / tri / notifs / streak pour la nutrition
  — l'inverse de l'objectif de l'ADR-0002. Rejeté.

### Option 4 — Suivi sans chiffres (habitudes positives)

- Bon : **élimine** le risque TCA à la racine ; la plus « bienveillante ».
- Mauvais : ne répond pas à la demande du porteur d'un suivi **chiffré complet**.
  Écartée en connaissance de cause ; ses garde-fous sont **réinjectés** dans
  l'option 1 comme conditions.

## Pour aller plus loin

- ADR-0002 — `MEALS` comme nouvelle table de détail du feed polymorphe (extension
  déjà anticipée).
- ADR-0004 — RLS par `group_id` sur `MEALS` ; photos de repas dans le bucket protégé.
- ADR-0006 — Les notifications/relances n'appliquent aucun jugement punitif à la
  nutrition.
- Vision §8 — Réouverture assumée du garde-fou nutrition et garde-fous de sécurité
  associés.
