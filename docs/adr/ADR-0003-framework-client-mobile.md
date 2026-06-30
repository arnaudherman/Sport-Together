---
id: ADR-0003
title: Framework client mobile — Expo/React Native, iOS-first
status: accepted
date: 2026-06-25
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - mobile
  - client
  - cross-platform
  - ios
  - android
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase (PostgreSQL + Auth + Realtime + Storage)
  - ADR-0002  # Modèle de feed polymorphe (table FEED_ITEMS)
---

# ADR-0003 — Framework client mobile : Expo/React Native, iOS-first

## Contexte et énoncé du problème

Sport Together est une application sociale de motivation sportive : des groupes
fermés d'amis suivent les séances de chacun, réagissent, et maintiennent un streak
collectif. Le produit n'a de valeur qu'en groupe et repose sur les notifications
push comme moteur d'engagement social.

Stratégie de lancement : valider d'abord auprès d'un groupe d'amis réel (très
majoritairement sur iOS), puis ouvrir au public si la rétention se confirme.

Contraintes structurantes :

- **iOS est la plateforme prioritaire** au lancement (base d'amis sur iOS).
- **Android est un futur certain**, pas au lancement mais à terme : un utilisateur
  Android devra pouvoir appartenir aux mêmes groupes et au même feed qu'un
  utilisateur iOS.
- Le projet est porté par **un développeur solo** dont l'expertise est
  TypeScript / React / Next.js (et des fondations solides en C/C++).
- Objectif explicite : architecture **propre et testable dès le départ**, prête à
  un lancement public sans réarchitecture.

La question : quel framework client adopter pour servir iOS maintenant et Android
plus tard, sans dette de réécriture et sans diviser la vélocité d'un dev solo ?

## Note de cadrage importante — l'interop n'est pas un driver de client

> L'interopérabilité iOS ↔ Android (un Android et un iPhone dans le même groupe)
> est **garantie par le backend partagé** (Supabase / PostgreSQL — voir ADR-0001),
> **pas par le choix du framework client**. Deux clients distincts qui interrogent
> le même schéma partagent automatiquement groupes, feed et réactions. Le graphe
> social est une propriété du serveur ; le client n'est qu'une fenêtre dessus.
>
> Cette exigence est donc **satisfaite dans tous les scénarios** ci-dessous. Elle
> ne justifie PAS à elle seule un codebase unique. Le codebase unique se justifie
> par l'économie de maintenance en solo (voir drivers), pas par l'interop.

## Décideurs et facteurs de décision

- **Maintenance solo** : éviter de coder chaque fonctionnalité deux fois et pour
  toujours — facteur potentiellement rédhibitoire.
- **Android certain à terme** : éviter toute réécriture planifiée du client.
- **iOS-first sans compromis fonctionnel** : pouvoir livrer et peaufiner iOS en
  premier.
- **Réutilisation des compétences** TypeScript / React du porteur.
- **Notifications push** fiables (moteur social du produit).
- **Propreté et testabilité** dès le départ.
- **Vitesse de mise sur le marché.**

## Options considérées

1. Deux applications natives séparées — Swift/SwiftUI (iOS) + Kotlin/Jetpack
   Compose (Android).
2. Natif Swift/SwiftUI d'abord, application Android native réécrite plus tard.
3. **Expo / React Native (New Architecture), un seul codebase, iOS-first.**
4. Flutter (Dart), un seul codebase.

## Décision

Option retenue : **3 — Expo / React Native, iOS-first.**

Un codebase TypeScript unique sert iOS dès le lancement et Android le moment venu,
au prix marginal d'un build supplémentaire plutôt que d'une réécriture. La couche
de notifications push est couverte par Expo Notifications. Le backend Supabase
(ADR-0001) et le modèle de feed polymorphe (ADR-0002) sont indépendants de ce
choix et restent valides tels quels.

L'approche « iOS-first » est conservée : l'effort de finition et la première
livraison ciblent iOS ; Android est activé ultérieurement sur quasiment le même
code.

## Conséquences

### Positives

- Une seule base de code pour les deux plateformes : chaque fonctionnalité est
  écrite une fois.
- Réutilisation directe de l'expertise TypeScript / React ; Expo Router est
  file-based, sur le même modèle mental que Next.js.
- Android devient un coût marginal (build + ajustements), pas un projet de
  réécriture — cohérent avec « Android est un futur certain ».
- Notifications push gérées via Expo Notifications ; mises à jour OTA possibles
  pour les correctifs non natifs ; builds cloud via EAS (pas de dépendance à une
  machine locale pour livrer).
- Compatible avec une architecture propre et testable (voir « Confirmation »).

### Négatives

- Finition iOS légèrement en deçà d'un natif Swift pur sur les détails les plus
  fins — écart jugé négligeable pour une app de feed social (listes, formulaires,
  photos), surtout depuis la New Architecture.
- Couplage à l'écosystème Expo / EAS.
- Une bibliothèque native très spécifique peut nécessiter un *development build*
  ou un module natif dédié.

### Neutres

- « iOS-first » et « codebase cross-platform » ne s'opposent pas.
- Repli disponible : pour un écran exigeant un poli natif extrême, on peut écrire
  un module natif Swift via l'API Expo Modules **sans** abandonner le codebase
  unique.

## Confirmation (comment on vérifie que la décision est respectée)

- Le code client ne référence le SDK Supabase **que** dans la couche `data/` ;
  les écrans/hooks dépendent d'interfaces de repository (`domain/`), jamais de
  Supabase directement — vérifiable en revue d'architecture et par règle de lint.
- Un build Android doit rester **produisible à tout moment** (vérification CI
  ponctuelle), même si Android n'est pas encore distribué, afin que le futur
  support Android ne dérive pas silencieusement.
- Les hooks / view-models sont testés unitairement contre des repositories
  mockés.

## Avantages et inconvénients des options

### Option 1 — Deux apps natives (Swift + Kotlin)

- Bon : finition maximale et accès plein aux API sur chaque plateforme.
- Mauvais : double codebase à maintenir en solo (chaque feature codée deux fois) ;
  deux langages/écosystèmes à maîtriser ; vélocité divisée. Rédhibitoire pour un
  dev solo.

### Option 2 — Natif Swift d'abord, Android réécrit ensuite

- Bon : meilleur feel iOS au lancement ; mono-focus initial.
- Mauvais : Android impose une **réécriture complète du client** (dette planifiée) ;
  travail doublé étalé dans le temps ; incohérent avec un Android certain.

### Option 3 — Expo / React Native, iOS-first (retenue)

- Bon : codebase unique iOS + Android ; réutilise TypeScript/React ; Expo Router
  ≈ Next.js ; push via Expo Notifications ; OTA ; builds cloud EAS ; Android quasi
  gratuit le moment venu.
- Mauvais : finition iOS légèrement inférieure au natif pur ; couplage Expo/EAS ;
  modules natifs ponctuels possibles.

### Option 4 — Flutter (Dart)

- Bon : cross-platform performant, rendu cohérent au pixel près.
- Mauvais : Dart à apprendre — **aucune réutilisation** des compétences du porteur ;
  écosystème éloigné de son univers TS/web ; pas d'avantage décisif vs Expo pour
  une app de feed.

## Pour aller plus loin

- ADR-0001 — Backend : Supabase (PostgreSQL, Auth dont Sign in with Apple,
  Realtime, Storage, Row Level Security). Garantit l'interop iOS ↔ Android.
- ADR-0002 — Modèle de feed polymorphe (`FEED_ITEMS` + tables de détail).
  Indépendant du framework client ; les futurs types (pesées, repas) s'y branchent
  sans migration.
- Repli de finition : module natif Swift via l'API Expo Modules pour un écran
  ciblé, sans renoncer au codebase unique.
