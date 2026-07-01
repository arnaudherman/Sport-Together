---
id: ADR-0005
title: Authentification & identité (Sign in with Apple + magic link e-mail)
status: accepted
date: 2026-06-30
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - auth
  - identity
  - security
  - supabase
  - ios
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase
  - ADR-0004  # Isolation multi-tenant & RLS
  - ADR-0007  # Architecture client en couches
---

# ADR-0005 — Authentification & identité

> **Statut d'implémentation (2026-07-01) : partiel.** Le **magic link e-mail (OTP)**
> est implémenté de bout en bout (AuthRepository + écran de connexion). **Sign in
> with Apple n'est PAS encore implémenté** (ni dépendance `expo-apple-authentication`,
> ni provider Apple) — c'est un report assumé, à câbler avant le lancement iOS. Le
> stockage de session est désormais chiffré via expo-secure-store (conforme).

## Contexte et énoncé du problème

L'authentification est gérée par **Supabase Auth** (ADR-0001) : le porteur ne code
pas d'infrastructure d'auth. Restent à trancher **quelles méthodes de connexion** le
MVP propose et **comment l'identité** d'un utilisateur est représentée.

Deux contraintes issues du cadrage (vision v1.0) :

- **Friction minimale** : sur la plateforme prioritaire iOS, se connecter doit être
  quasi instantané.
- **Portabilité** : le groupe fondateur peut comporter un membre **non-iOS** (ou un
  iPhone trop ancien pour Sign in with Apple), et Android est un futur certain. Il
  faut donc un chemin de connexion qui ne dépende pas d'Apple.

Par ailleurs, l'identité retournée par l'authentification alimente directement la
**RLS** (`auth.uid()`, ADR-0004) et tout le graphe social (`MEMBERSHIPS`,
`FEED_ITEMS.author_id`…). Enfin, **Sign in with Apple peut masquer l'e-mail** (relais
privé `@privaterelay.appleid.com`) et ne fournit le nom **qu'une seule fois** — ce
qui impose un **profil applicatif** (pseudo + avatar) pour que le feed soit lisible.

## Décideurs et facteurs de décision

- **Friction minimale** sur iOS (Sign in with Apple, one-tap Face ID).
- **Chemin cross-plateforme** dès le MVP (un membre non-iOS doit pouvoir entrer).
- **Zéro gestion de mot de passe** (sécurité, reset, stockage — à éviter).
- **Auth managée** : ne pas réimplémenter ce que Supabase fournit (ADR-0001).
- **Identité stable** découplée du fournisseur, comme socle de la RLS.
- **Conformité Apple/RGPD** : suppression de compte obligatoire ; gestion du relais
  d'e-mail privé.
- **Profil minimal** (pseudo + avatar) pour un feed lisible.

## Options considérées

1. **Supabase Auth multi-provider : Sign in with Apple + magic link e-mail (OTP),
   un compte = un provider.**
2. **Sign in with Apple seul** au MVP.
3. **E-mail + mot de passe** classique.
4. **Service d'auth tiers** (Clerk / Auth0 / Firebase Auth) au-dessus de Supabase.

## Décision

Option retenue : **1 — Sign in with Apple + magic link e-mail, un compte = un
provider.**

Détails :

- **Deux providers natifs Supabase** : Sign in with Apple (configuré côté Apple
  Developer — Service ID, clé) et **magic link e-mail** (lien/code OTP, sans mot de
  passe). On démarre sur le **SMTP par défaut** de Supabase (limité en débit) puis on
  bascule sur un **SMTP dédié** (Resend/Postmark/SES) pour la délivrabilité **avant**
  toute ouverture publique.
- **Un compte = un provider au MVP, pas de fusion d'identités.** Sign in with Apple
  pouvant masquer l'e-mail, on ne peut pas *fiablement* rapprocher un compte Apple et
  un compte e-mail sur l'adresse ; lier les deux (preuve de propriété, sécurité du
  linking) est un cas piégeux **repoussé**. Conséquence assumée : un utilisateur qui
  se connecte tantôt via Apple, tantôt via e-mail crée **deux comptes distincts** —
  l'UX invite donc à **garder la même méthode**.
- **Identité métier = `auth.uid()`** (UUID Supabase), clé référencée par le profil,
  `MEMBERSHIPS`, `FEED_ITEMS.author_id`, etc. Le provider n'est qu'un **détail
  d'authentification**, jamais la clé d'identité.
- **Profil applicatif** : table `profiles` en 1-à-1 avec `auth.users`, portant
  `pseudo` et `avatar_url` (avatar dans Storage). L'**onboarding impose le choix du
  pseudo** (Apple ne donne le nom qu'une fois, l'utilisateur peut le refuser).
- **Suppression de compte** (exigence Apple 5.1.1(v) + RGPD) : un flux dédié supprime
  `auth.users` ; le contenu de groupe de l'utilisateur est **anonymisé**
  (« membre supprimé ») plutôt que supprimé en dur, pour ne pas trouer le feed et les
  streaks des autres membres.
- **Sécurité client** : le jeton de session est stocké **chiffré** via
  `expo-secure-store` (Keychain iOS), jamais en clair ; le magic link s'ouvre dans
  l'app via **deep link / universal link**.

## Conséquences

### Positives

- **Friction minimale sur iOS** (Sign in with Apple) **et** chemin **cross-
  plateforme** (magic link) dès le MVP — un membre non-iOS peut entrer tout de suite.
- **Zéro mot de passe** à gérer ; auth entièrement **managée**.
- **Identité stable et découplée** du provider : changer/ajouter une méthode plus
  tard n'impacte pas le graphe social ni la RLS.

### Négatives

- **Deux chemins** à configurer et tester (Apple Developer + SMTP + deep links).
- **Délivrabilité e-mail** à surveiller (SMTP dédié avant le public).
- **Comptes dupliqués** possibles si un utilisateur alterne les méthodes — atténué
  par une UX explicite, mais réel tant qu'on ne lie pas les identités.
- **Suppression de compte** et son anonymisation en cascade à implémenter
  proprement.

### Neutres

- La **fusion d'identités** multi-provider reste possible ultérieurement (couture
  propre laissée ouverte).
- Sign in with Apple fonctionnera sur Android via le flux web si nécessaire, mais le
  **magic link** est le chemin Android privilégié.

## Confirmation

- L'app propose Sign in with Apple **et** magic link ; un test de bout en bout couvre
  les deux flux.
- Le jeton de session est stocké via SecureStore (chiffré), **jamais** en clair.
- Un **flux de suppression de compte** existe, avec anonymisation en cascade testée.
- L'identité métier est **`auth.uid()`** ; aucune logique n'utilise l'e-mail comme
  clé d'identité.
- Le **profil (pseudo + avatar)** est obligatoire à l'onboarding.
- L'accès à Supabase Auth se fait **uniquement** via un `AuthRepository` (ADR-0007) ;
  la présentation ne connaît pas Supabase.

## Avantages et inconvénients des options

### Option 1 — SiwA + magic link, un compte = un provider (retenue)

- Bon : friction minimale iOS **et** portabilité immédiate ; zéro mot de passe ;
  identité découplée du provider.
- Mauvais : deux chemins à maintenir ; SMTP/délivrabilité ; comptes dupliqués
  possibles avant fusion d'identités.

### Option 2 — Sign in with Apple seul

- Bon : le plus simple, one-tap, rien à configurer côté e-mail.
- Mauvais : **exclut tout membre non-iOS dès le MVP** (bloquant si le cercle 1 n'est
  pas 100 % iOS) ; sur Android plus tard, flux web dégradé.

### Option 3 — E-mail + mot de passe

- Bon : universel et familier.
- Mauvais : gestion des mots de passe, reset, fuites, friction — à rebours du
  « zéro infrastructure d'auth » et de la friction minimale.

### Option 4 — Service d'auth tiers (Clerk/Auth0/Firebase)

- Bon : DX et fonctionnalités avancées.
- Mauvais : **redondant** avec Supabase Auth déjà retenu (ADR-0001) ; couplage et
  coût supplémentaires ; l'intégration RLS (`auth.uid()`) serait à refaire. Aucun
  avantage décisif pour ce produit.

## Pour aller plus loin

- ADR-0001 — Supabase Auth (Sign in with Apple, magic link) comme service géré.
- ADR-0004 — `auth.uid()` est la clé sur laquelle reposent toutes les politiques RLS.
- ADR-0007 — `AuthRepository` : interface multi-provider ; la présentation dépend de
  cette interface, jamais du SDK Supabase directement.

## Mise à jour (2026-07-01) — Stockage de session par plateforme

Le stockage chiffré via **expo-secure-store** (Keychain/Keystore) n'existe **que sur
natif** : l'utiliser au rendu **web/SSR** plantait (`ExpoSecureStore.getValueWithKeyAsync
is not a function`) dès que Supabase est configuré (le rendu statique instancie le
client). L'adaptateur de session est désormais **choisi selon `Platform.OS`** :
SecureStore chiffré (natif) · `localStorage` (web) · no-op (SSR, pas de session côté
serveur). Décision : la session reste chiffrée là où c'est possible (natif, cible
principale) ; le web utilise le stockage standard navigateur. Voir `core/supabase/client.ts`.

