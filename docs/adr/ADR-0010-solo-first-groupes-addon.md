---
id: ADR-0010
title: Solo-first — le groupe devient un add-on optionnel (privé)
status: accepted
date: 2026-07-01
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - product
  - vision
  - social
  - navigation
supersedes: []
superseded-by: []
related:
  - ADR-0002  # Feed polymorphe (réutilisé pour le fil d'accueil)
  - ADR-0004  # RLS par groupe (les groupes restent, en add-on)
  - ADR-0009  # Gamification (la progression perso porte le solo)
---

# ADR-0010 — Solo-first, groupes en add-on

## Contexte et énoncé du problème

La vision v1 posait **le groupe comme unité de valeur** : appartenance à un groupe
**obligatoire**, « une personne seule sur l'app n'a aucune raison de rester » (§2/§3).
À l'usage, le porteur juge ce cadre trop contraignant et veut **inverser l'accent** :
mettre l'individu au centre (sa progression, ses posts, son profil), et faire du groupe
un **bonus d'entraide optionnel**. Problème : comment garder la valeur du collectif sans
imposer un groupe pour utiliser l'app ?

## Facteurs de décision

- **Activation sans friction** : pouvoir utiliser l'app **seul**, dès l'onboarding.
- **Rétention en solo** : répondre au « pourquoi rester seul » autrement que par le groupe.
- **Garder le levier social** sans le rendre obligatoire.
- **Réutiliser l'existant** (feed polymorphe, RLS, gamification) sans tout refondre.

## Options considérées

1. **Groupe obligatoire** (v1) : pas d'app sans groupe.
2. **Solo-first + groupes optionnels privés** : l'individu est le cœur ; les groupes
   sont un add-on d'entraide, rejoignables par code, remontés dans l'accueil, affichés
   sur le profil.
3. **Pur solo** : pas de groupes du tout.

## Décision

Option retenue : **2 — solo-first, groupes en add-on privé.**

- **Plus de gate groupe obligatoire.** Après l'onboarding, on atterrit sur l'**Accueil**
  = un **fil social type Twitter** (`FeedRepository.listHomeFeed`) : tes posts + tes
  abonnements + l'activité de tes groupes, avec un filtre **Tout / Abonnements / Groupes**.
- **La rétention solo** est portée par la **progression personnelle** (XP, niveaux, holy
  graph — ADR-0009), les **streaks**, et le **social par follow** (abonnements).
- **Les groupes** deviennent des **cercles privés optionnels** (rejoindre par code) pour
  **s'entraider** (nudge, quêtes, journée parfaite). Leur activité remonte dans l'accueil
  (badge 🔒 groupe sur les posts) et le **profil liste les groupes** où l'on est.
- **Le collectif reste valorisé** (entraide, pas rivalité — cohérent §8/ADR-0009), mais
  n'est plus un prérequis.

Cela **met à jour la vision** (le groupe n'est plus L'unité de valeur ; l'individu l'est,
le groupe l'amplifie) — acté en vision v2.

## Conséquences

### Positives

- Activation immédiate en solo ; plus de mur d'entrée.
- Modèle plus scalable et différenciant (self-improvement social, pas « énième app de groupe »).
- Réutilise le feed polymorphe (accueil = feed sans filtre groupe, la RLS scope déjà).

### Négatives / à construire

- **Abonnements (follows)** deviennent un vrai besoin backend (table `follows`) — le fil
  « Abonnements » est aujourd'hui dérivé/partiel.
- **Timeline perso** : publier « solo » (post sans groupe) demandera un `group_id`
  nullable ou un « groupe personnel » ; pour l'instant les posts vont à un groupe par
  défaut (le premier de l'utilisateur).
- La navigation a été refondue (accueil ↔ profil ↔ groupe ↔ publier), sans écran de gate.

### Confirmation

- L'app est utilisable **sans rejoindre de groupe** (mock : on atterrit sur l'accueil).
- Les groupes sont accessibles depuis le **profil** (chips + « Rejoindre ») et filtrables
  dans l'accueil. Aucune étape ne force l'adhésion.

## Pour aller plus loin

- `docs/mockups/solo-home.html` — maquette validée (accueil solo + profil avec groupes).
- ADR-0009 — la gamification perso est le moteur de rétention solo.
- Backlog : table `follows`, timeline perso, destination de publication.
