---
id: ADR-0009
title: Gamification & progression (XP, niveaux, arbres de compétences, entraide)
status: accepted
date: 2026-07-01
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - gamification
  - product
  - motivation
  - data-model
supersedes: []
superseded-by: []
related:
  - ADR-0002  # Modèle de feed polymorphe (extension additive)
  - ADR-0004  # Isolation multi-tenant & RLS (nouvelles tables)
  - ADR-0008  # Nutrition & garde-fous
---

# ADR-0009 — Gamification & progression

## Contexte et énoncé du problème

L'objectif produit se précise : **pousser les gens à aller plus loin** — dans le
corps (muscu, cardio), l'hygiène de vie et l'esprit (lecture, philo) — pas
seulement à maintenir une habitude. Le porteur, issu de l'école 42, veut la
mécanique qui a fait ses preuves là-bas : une **carte de progression qu'on veut
remplir** (le *holy graph*), de l'XP, des niveaux, et un ressort social.

Le problème : **comment gamifier pour motiver, sans trahir les anti-objectifs
verrouillés de la vision** (§8) — « le groupe avant l'individu », « **pas de
valorisation de la performance individuelle ni de comparaison compétitive entre
amis** », « **zéro toxic-stress** » ? La référence visuelle qui inspire le porteur
(Promethee) repose au contraire sur un **classement compétitif mondial** — modèle
frontalement contraire à ces garde-fous.

## Décideurs et facteurs de décision

- **Motivation durable** : donner envie de progresser et de revenir.
- **Fidélité aux anti-objectifs** (§8) : non punitif, pas de comparaison
  compétitive toxique, le groupe reste central.
- **Extensibilité** : ajouter un domaine (arbre) doit être additif (cohérence
  ADR-0002), pas une refonte.
- **Cohérence avec l'entraide** : le levier social doit *tirer vers le haut*.
- **Maîtrise du scope** : ne pas tout front-loader avant que la boucle core soit
  prouvée.

## Options considérées

1. **Gamification compétitive** : classement mondial, rangs, XP comparée entre
   amis, boosts compétitifs (façon Promethee).
2. **Progression personnelle + quêtes d'entraide coopératives** : XP/niveaux/arbres
   de compétences mesurant *son* chemin ; le social passe par l'**entraide** (aider
   un ami à franchir un palier), sans classement.
3. **Pas de gamification** : s'en tenir au streak et aux réactions.

## Décision

Option retenue : **2 — progression personnelle + quêtes d'entraide coopératives.**

Concrètement :

- **XP → Niveaux → Boosts.** Chaque goal loggé rapporte de l'XP ; niveaux sur une
  courbe quadratique douce ; le **streak** multiplie l'XP ; la **journée parfaite**
  du groupe donne un bonus collectif ; quêtes hebdo ; saisons (esprit *piscine* 42).
- **Arbres de compétences par domaine** (Corps/Muscu, Souffle/Cardio, Hygiène de
  vie, Esprit/Lecture-Philo) : des **nœuds à débloquer**, chacun = un palier concret
  qui donne de l'XP + un badge et **ouvre les nœuds suivants**. C'est le « jusqu'où
  je peux aller », intrinsèque (contre soi et la carte, pas contre les autres).
- **Quêtes d'entraide** (le social non-toxique) : un membre lance une quête sur un
  ami (« aider Léa à passer 15 tractions ») ; au palier franchi, **l'aidé gagne le
  nœud + XP, et l'aidant gagne de l'XP de mentor**. Aider devient aussi gratifiant
  que réussir.
- **AUCUN classement compétitif** (ni mondial, ni entre amis). Les niveaux/XP sont
  affichés comme *son* statut, jamais comme un tri « qui est le meilleur ».

Ce choix **réconcilie** la gamification avec le §8 : la progression est
individuelle-contre-soi (pas de comparaison compétitive), et le levier social est
l'entraide (pas la rivalité). Il **élargit assumément le scope** produit vers le
self-improvement gamifié — acté en vision v1.1.

## Conséquences

### Positives

- Motivation forte (carte à remplir, paliers, entraide) sans le venin d'un
  classement — fidèle aux anti-objectifs.
- **Extensible** : un nouvel arbre = nouvelles données, pas de refonte (ADR-0002).
- L'entraide transforme le différenciateur (« on se pousse ») en mécanique de jeu.

### Négatives

- **Nouveau modèle de données** à concevoir et sécuriser (RLS) : `skill_nodes`
  (catalogue), `user_skill_progress`, `quests`.
- **Surface produit élargie** : risque de dispersion si tout est construit d'un
  coup → séquencement obligatoire (voir Confirmation).
- Une progression individuelle, même non compétitive, doit rester **au service** du
  collectif (le groupe reste l'unité de valeur).

### Neutres

- Un catalogue d'arbres (nœuds, prérequis) doit être curé — travail de contenu.
- L'XP peut rester **dérivable du feed** (`xpFromFeed`) avant d'être matérialisée.

## Confirmation

- **Aucun** endpoint, vue ou écran ne classe/compare les XP ou niveaux des membres
  de façon compétitive (vérifiable comme les garde-fous d'ADR-0008).
- Les tables de gamification sont **additives** (ADR-0002) et sous **RLS** par
  utilisateur / par groupe (ADR-0004).
- Les quêtes d'entraide récompensent **l'aidant autant que l'aidé**.
- **Séquencement** respecté (garde-fou « prouver la boucle d'abord ») : v1 = DA +
  XP/niveaux/streak-boost + **un seul arbre (Muscu)** ; v2 = quêtes + 2ᵉ arbre ; v3 =
  saisons, arbres Esprit/Hygiène, radar/profils riches.

## Avantages et inconvénients des options

### Option 1 — Gamification compétitive (classement)

- Bon : ressort de compétition très motivant pour une partie des utilisateurs ;
  visuellement spectaculaire.
- Mauvais : **viole frontalement** les anti-objectifs §8 (comparaison compétitive,
  toxic-stress) ; pousse à la performance individuelle exhibée ; dilue l'intimité
  du cercle fermé. Rejetée.

### Option 2 — Progression perso + entraide (retenue)

- Bon : motive par la maîtrise et l'entraide ; **compatible** §8 ; extensible ;
  renforce le collectif au lieu de le mettre en rivalité.
- Mauvais : nouveau modèle de données ; scope élargi à séquencer.

### Option 3 — Pas de gamification

- Bon : scope minimal, rien à construire.
- Mauvais : passe à côté du levier de motivation que le porteur juge central ;
  n'atteint pas le « pousser à aller plus loin ». Rejetée.

## Pour aller plus loin

- `docs/GAMIFICATION.md` — conception détaillée (moteur XP, arbres, quêtes, modèle
  de données, séquencement).
- `docs/DESIGN-SYSTEM.md` — la DA qui porte visuellement la gamification.
- ADR-0002 — les données de gamification s'étendent sans migration douloureuse.
- ADR-0004 — RLS des nouvelles tables (`skill_nodes`, `user_skill_progress`,
  `quests`).
- Vision v1.1 — élargissement de scope + réconciliation du §8.
