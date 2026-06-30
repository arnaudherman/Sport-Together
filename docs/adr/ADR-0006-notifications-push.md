---
id: ADR-0006
title: Notifications push (Expo Notifications + Expo Push Service, déclenchement serveur)
status: accepted
date: 2026-06-30
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - notifications
  - push
  - expo
  - supabase
  - engagement
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase (Edge Functions, webhooks)
  - ADR-0003  # Framework client — Expo/React Native
  - ADR-0004  # Isolation multi-tenant & RLS
  - ADR-0007  # Architecture client en couches
---

# ADR-0006 — Notifications push

> **Statut d'implémentation (2026-07-01) : serveur prêt, client non câblé.** Côté
> serveur tout est en place : table `device_tokens` + RLS, trigger de notification,
> Edge Functions `notify_group` (avec secret partagé) et `nudge` (avec throttle
> anti-harcèlement). Côté **client il manque** : `expo-notifications`, l'obtention
> et l'enregistrement du token (`NotificationRepository.registerToken` n'est appelé
> nulle part), le deep link et le bouton de relance. Sans cela, aucune notification
> n'est reçue — à finir lors de la tranche d'intégration client.

## Contexte et énoncé du problème

Les notifications push sont le **moteur d'engagement social** du produit (vision,
ADR-0003) : sans elles, le feed est silencieux et la boucle core ne tourne pas. Le
MVP doit au minimum :

- prévenir les membres d'un groupe **« X vient de logger »** à chaque nouveau goal ;
- permettre la **relance / le nudge** d'un membre qui n'a pas encore loggé.

Le client est **Expo / React Native** (ADR-0003) et le backend **Supabase**
(ADR-0001, avec Edge Functions Deno et Database Webhooks). La question : par quelle
brique technique envoyer les push, et **où les déclencher** ?

Deux exigences structurent le choix :

- **Fiabilité** : la notification ne doit pas dépendre du fait que le client de
  l'auteur reste ouvert.
- **Isolation & sécurité** : seuls les membres du groupe concerné sont notifiés
  (ADR-0004), et aucun client ne doit pouvoir décider d'envoyer des push aux autres.

## Décideurs et facteurs de décision

- **Un seul code** pour iOS maintenant et Android plus tard (cohérent ADR-0003).
- **Déclenchement serveur** fiable, indépendant de l'état du client émetteur.
- **Respect de l'isolation** : destinataires calculés côté serveur.
- **Gestion des credentials** push (APNs aujourd'hui, FCM demain) minimisée.
- **Maintenance solo** : peu de code d'infrastructure.

## Options considérées

1. **Expo Notifications + Expo Push Service (EPS)**, déclenché **côté serveur** via
   Supabase (Database Webhook / trigger → Edge Function → API Expo Push).
2. **APNs (et FCM) directs**, sans Expo Push Service (credentials gérés soi-même).
3. **Service tiers** (OneSignal, ou FCM via SDK) intégré au client.
4. **Déclenchement côté client** (le client émetteur notifie les autres).

## Décision

Option retenue : **1 — Expo Notifications + Expo Push Service, déclenchement
serveur.**

Mécanisme :

- **Côté client (Expo Notifications)** : demande de permission, obtention d'un
  **Expo push token** par appareil, stocké dans une table `device_tokens` liée à
  `user_id` (multi-appareils, rafraîchissement, invalidation gérés).
- **Déclenchement serveur** : à l'insertion d'un `feed_item`, un **Database Webhook**
  Supabase appelle une **Edge Function** `notify_group` qui, avec le **service role**
  (bypass RLS contrôlé), lit les membres du groupe, récupère leurs tokens (**sauf
  l'auteur**) et appelle l'**API Expo Push** en lot.
- **Pourquoi serveur et pas client** : fiabilité (le client émetteur peut se fermer),
  sécurité (un client ne doit pas pouvoir spammer les autres), et respect de
  l'isolation (la sélection des destinataires est faite côté serveur).
- **Relance / nudge au MVP** : **initiée par un membre** — taper « encourager » sur
  quelqu'un qui n'a pas loggé déclenche une Edge Function envoyant un push **ciblé**.
  Les **rappels automatiques programmés** (scheduled) sont repoussés en **Phase 2**
  (pg_cron / scheduled function), pour ne pas embarquer un ordonnanceur au MVP.
- **Credentials** : EAS gère les credentials **APNs** (et **FCM** pour Android plus
  tard) ; Expo Push Service route vers le bon transport — un seul code, deux
  plateformes.
- **Deep linking** : le payload porte `group_id` / `feed_item_id` ; taper la notif
  ouvre l'écran du groupe/feed concerné.
- **Receipts** : on traite les **push receipts** d'Expo pour purger les tokens
  invalides (`DeviceNotRegistered`).
- **Development build requis** : les push distants ne fonctionnent pas dans Expo Go —
  on passe par un *development build* (cohérent avec la note de l'ADR-0003).

## Conséquences

### Positives

- **Un seul code** couvre iOS (et Android futur) via Expo Push Service ; EAS gère les
  credentials par plateforme.
- Déclenchement **serveur fiable et sécurisé** ; **isolation respectée** (destinataires
  choisis côté serveur).
- Très peu de code d'infrastructure push à maintenir en solo.

### Négatives

- **Couplage à Expo Push Service** (encore l'écosystème Expo — assumé, cohérent
  ADR-0003).
- Une **Edge Function + un webhook** à écrire et maintenir ; **gestion des tokens**
  (refresh, multi-appareils, invalidation via receipts).
- **Development build** nécessaire (pas Expo Go).
- Dépendance aux **quotas/latence** de l'API Expo Push.

### Neutres

- On peut basculer vers **APNs/FCM directs** plus tard si besoin, sans changer
  l'architecture serveur (le point de déclenchement reste l'Edge Function).
- Les **rappels programmés** sont une extension naturelle en Phase 2.

## Confirmation

- Un nouvel `feed_item` déclenche une notification aux **autres** membres du groupe
  (test de bout en bout).
- Les destinataires sont calculés **côté serveur** ; aucun client ne choisit qui
  notifier.
- Les **tokens invalides** sont purgés via les receipts Expo.
- Taper une notification ouvre le **bon écran** (deep link).
- L'accès aux notifications côté client passe par un **service/repository dédié**
  (ADR-0007), jamais par un appel Supabase/Expo dans la présentation.

## Avantages et inconvénients des options

### Option 1 — Expo Notifications + EPS, déclenchement serveur (retenue)

- Bon : cross-plateforme avec un seul code ; serveur fiable et sécurisé ; EAS gère
  les credentials ; peu d'infra à maintenir.
- Mauvais : couplage Expo ; Edge Function + webhook + gestion des tokens ; dev build.

### Option 2 — APNs (et FCM) directs

- Bon : contrôle total, aucun intermédiaire.
- Mauvais : gérer certificats/credentials **par plateforme**, deux transports
  distincts, beaucoup de code d'infrastructure — à rebours du « solo + managé ».

### Option 3 — Service tiers (OneSignal…)

- Bon : fonctionnalités (segmentation, analytics, campagnes).
- Mauvais : **SDK et service supplémentaires**, coût, redondant avec Expo, données
  utilisateurs confiées à un acteur de plus. Sur-dimensionné pour le MVP.

### Option 4 — Déclenchement côté client

- Bon : rien à écrire côté serveur.
- Mauvais : **non fiable** (client émetteur fermé = pas de notif) ; **faille de
  sécurité** (un client pourrait spammer) ; incompatible avec l'isolation. **Non
  viable.**

## Pour aller plus loin

- ADR-0003 — Expo Notifications, builds EAS (credentials), *development build*.
- ADR-0001 — Supabase Edge Functions + Database Webhooks comme point de déclenchement.
- ADR-0004 — La sélection des destinataires côté serveur respecte l'isolation par
  groupe (service role contrôlé).
- ADR-0007 — Un service/`NotificationRepository` isole la présentation des SDK
  Expo/Supabase.
