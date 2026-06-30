---
id: ADR-0001
title: Backend — Supabase (PostgreSQL + Auth + Realtime + Storage + RLS)
status: accepted
date: 2026-06-25
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - backend
  - infrastructure
  - database
  - auth
supersedes: []
superseded-by: []
related:
  - ADR-0002  # Modèle de feed polymorphe
  - ADR-0003  # Framework client — Expo/React Native
---

# ADR-0001 — Backend : Supabase

## Contexte et énoncé du problème

Sport Together a besoin d'un backend pour gérer les comptes, les groupes fermés,
l'appartenance aux groupes, le feed d'activité, les réactions, et le stockage des
photos de séance. Trois exigences structurent le choix :

- **Confidentialité par groupe** : un membre ne voit que les groupes auxquels il
  appartient.
- **Temps réel** : le feed doit se rafraîchir quand un membre logge une séance.
- **Interopérabilité iOS ↔ Android** : un utilisateur Android (futur) et un
  utilisateur iOS doivent partager les mêmes groupes et le même feed.

Le projet est porté par un **développeur solo** (compétences SQL solides) qui veut
une architecture **launch-ready** sans réécrire l'infrastructure de base
(authentification, temps réel, stockage).

## Décideurs et facteurs de décision

- Modèle **relationnel** pour des données fortement liées (groupes, membres, feed)
  avec intégrité référentielle.
- **Authentification managée**, dont Sign in with Apple, sans la coder soi-même.
- **Temps réel** intégré pour le feed.
- **Stockage de fichiers** pour les photos de séance.
- **Isolation par groupe** déclarative (Row Level Security).
- **Minimiser le code d'infrastructure** à écrire et maintenir en solo.
- **Réutilisation des compétences SQL** du porteur.
- **Coût** maîtrisé au lancement (offre gratuite généreuse).
- **Interop multi-plateforme** garantie côté serveur (clients distincts, même base).

## Options considérées

1. **Supabase** — PostgreSQL managé + Auth + Realtime + Storage + RLS.
2. **Firebase** — Firestore (NoSQL) + Auth + Cloud Messaging.
3. **Backend maison** — API Next.js + PostgreSQL managé (ex. Neon) + Drizzle, avec
   auth, temps réel et stockage à implémenter.
4. **Convex** — backend réactif TypeScript de bout en bout.

## Décision

Option retenue : **1 — Supabase.**

Supabase fournit dans un seul service tout ce dont le MVP a besoin : une base
PostgreSQL relationnelle (qui colle au modèle groupes/membres/feed et au schéma
polymorphe de l'ADR-0002), l'authentification dont Sign in with Apple, les
abonnements temps réel pour le feed, le stockage des photos, et la Row Level
Security qui implémente directement la confidentialité par groupe. Le porteur
conserve son modèle mental SQL et n'écrit aucun code d'auth, de temps réel ou de
stockage. Un SDK Swift et un SDK JavaScript officiels existent, ce qui couvre
aussi bien un futur client natif qu'un client Expo (ADR-0003).

## Conséquences

### Positives

- Auth, temps réel, stockage et RLS fournis : très peu de code d'infrastructure à
  maintenir en solo.
- PostgreSQL = jointures, clés étrangères, contraintes, vues, SQL complet ; idéal
  pour le schéma relationnel du produit.
- La RLS exprime la confidentialité par groupe de façon déclarative et centralisée.
- Interop iOS ↔ Android assurée : tout client tapant la même base partage les mêmes
  données.
- Offre gratuite adaptée à la phase de validation.

### Négatives

- Dépendance à un fournisseur (lock-in partiel) ; une migration future demanderait
  du travail, atténué par le fait que PostgreSQL reste standard.
- La Row Level Security a une courbe d'apprentissage et demande des tests
  rigoureux (une politique mal écrite = fuite de données entre groupes).

### Neutres

- Les Edge Functions (Deno) sont disponibles si une logique serveur s'avère
  nécessaire, sans imposer de backend séparé.

## Confirmation

- Chaque table contenant des données de groupe porte une politique RLS testée
  isolant les membres par `group_id`.
- Le client n'accède à Supabase que via la couche `data/` (voir ADR-0003) ; aucune
  requête Supabase dans la présentation.
- Des tests vérifient qu'un membre d'un groupe ne peut pas lire les données d'un
  autre groupe.

## Avantages et inconvénients des options

### Option 1 — Supabase (retenue)

- Bon : tout-en-un (Postgres, Auth, Realtime, Storage, RLS) ; SQL conservé ; SDK
  Swift et JS officiels ; offre gratuite ; interop serveur native.
- Mauvais : lock-in partiel ; RLS à maîtriser et tester.

### Option 2 — Firebase

- Bon : mature, temps réel solide, Cloud Messaging intégré.
- Mauvais : Firestore est **NoSQL** — modélisation des relations groupes/membres/
  feed moins naturelle ; s'éloigne des compétences SQL du porteur ; règles de
  sécurité propriétaires.

### Option 3 — Backend maison (Next.js + Neon + Drizzle)

- Bon : contrôle total ; réutilise la stack web exacte du porteur.
- Mauvais : il faut **recoder** auth, temps réel et stockage — exactement ce que
  Supabase offre gratuitement ; plus lent à lancer, à rebours de l'objectif.

### Option 4 — Convex

- Bon : excellent DX, temps réel et typage de bout en bout.
- Mauvais : modèle de données et écosystème différents ; quitte PostgreSQL/SQL ;
  pas d'avantage décisif vs Supabase pour ce produit.

## Pour aller plus loin

- ADR-0002 — Modèle de feed polymorphe, posé sur ce PostgreSQL.
- ADR-0003 — Client Expo, qui consomme Supabase via le SDK JavaScript.
- ADR-0004 (à venir) — Détail des politiques Row Level Security par groupe.
