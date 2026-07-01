---
id: ADR-0004
title: Isolation multi-tenant & Row Level Security (politiques par groupe)
status: accepted
date: 2026-06-30
deciders:
  - Shin (porteur du projet)
consulted: []
informed: []
tags:
  - security
  - multi-tenancy
  - rls
  - database
  - supabase
supersedes: []
superseded-by: []
related:
  - ADR-0001  # Backend — Supabase
  - ADR-0002  # Modèle de feed polymorphe
  - ADR-0005  # Authentification & identité
  - ADR-0007  # Architecture client en couches
---

# ADR-0004 — Isolation multi-tenant & Row Level Security

## Contexte et énoncé du problème

Sport Together est **multi-groupe** : un utilisateur appartient à plusieurs groupes
fermés via la table `MEMBERSHIPS` (relation n-à-n — voir ADR-0002 et la vision
v1.0). L'exigence absolue posée par l'ADR-0001 est qu'**un membre ne voie que les
données des groupes auxquels il appartient** : feed, séances, repas, réactions,
appartenances, photos. Une seule politique d'accès mal écrite suffit à provoquer
une **fuite de données entre groupes** — c'est-à-dire la rupture de la promesse
centrale du produit (la confidentialité du cercle fermé).

Un point structurant : Supabase expose les tables via **PostgREST**. Le client
émet ses requêtes directement contre la base, authentifié par son JWT. **On ne peut
donc pas se reposer sur le client, ni même uniquement sur la couche `data/` du
client, pour garantir l'isolation** : c'est la base de données elle-même qui doit
l'imposer. La Row Level Security (RLS) de PostgreSQL est le rempart de référence.

L'unité de cloisonnement (« tenant ») est le **groupe**, jamais l'utilisateur ni
une organisation. Toute donnée sensible est partitionnée par `group_id`.

Le projet est porté par un **développeur solo** : la solution doit être
**déclarative, centralisée, testable**, et offrir une défense en profondeur sans
multiplier le code d'infrastructure.

## Décideurs et facteurs de décision

- **Isolation garantie au niveau base** : un client compromis ou un bug applicatif
  ne doit jamais pouvoir lire/écrire les données d'un autre groupe.
- **Déclaratif et centralisé** : une source de vérité unique de la règle d'accès.
- **Pas de récursion RLS** : `MEMBERSHIPS` se référence lui-même (vérifier
  l'appartenance pour lire l'appartenance) — piège classique à éviter.
- **Chemin d'adhésion contrôlé** : rejoindre un groupe par code d'invitation ne doit
  pas permettre de s'injecter dans un `group_id` arbitraire.
- **Performance acceptable** : la vérification d'appartenance s'exécute par ligne.
- **Testabilité** : prouver l'isolation par des tests automatisés.

## Options considérées

1. **RLS par appartenance via une fonction *helper* `SECURITY DEFINER`**
   `is_group_member(group_id)`, appelée par les politiques de chaque table de groupe.
2. **RLS avec sous-requête `EXISTS` *inline*** répétée dans chaque politique (sans
   fonction helper).
3. **Isolation applicative seule** : pas de RLS, filtrage par `group_id` dans la
   couche `data/` du client.
4. **Isolation physique** : un schéma (ou une base) PostgreSQL par groupe.

## Décision

Option retenue : **1 — RLS par appartenance via une fonction helper
`SECURITY DEFINER`.**

Le mécanisme :

- Une fonction `is_group_member(gid uuid) returns boolean`, **`SECURITY DEFINER`** et
  **`STABLE`**, qui renvoie `EXISTS (SELECT 1 FROM memberships m WHERE m.group_id =
  gid AND m.user_id = auth.uid())`. Le `SECURITY DEFINER` lui permet de lire
  `MEMBERSHIPS` **sans** déclencher la RLS de cette table — ce qui **élimine la
  récursion** — et centralise la règle d'appartenance en un seul endroit.
- **RLS activée sur toutes les tables de groupe**, sans exception.
- Le **`group_id` est dénormalisé** sur les tables de détail (`SESSIONS`, `MEALS`,
  futures `WEIGH_INS`) et sur `REACTIONS`, afin que chaque politique reste une simple
  comparaison indexable `is_group_member(group_id)` — sans jointure vers
  `FEED_ITEMS` à l'intérieur de la politique. La cohérence du `group_id` dénormalisé
  est garantie par un trigger/contrainte.
- **Politiques par table** (esquisse) :
  - `groups` : `SELECT` si `is_group_member(id)` ; `INSERT` pour tout utilisateur
    authentifié (création) ; `UPDATE`/`DELETE` restreints au créateur.
  - `memberships` : `SELECT` si `is_group_member(group_id)` (voir ses co-membres) ;
    `DELETE` de **sa propre** ligne (quitter un groupe) ; **aucun `INSERT` direct** —
    l'adhésion passe exclusivement par une RPC.
  - `feed_items` : `SELECT`/`INSERT` si `is_group_member(group_id)` ; `author_id =
    auth.uid()` imposé ; `UPDATE`/`DELETE` réservés à l'auteur.
  - `sessions` / `meals` / détails : `SELECT`/`INSERT` si `is_group_member(group_id)`
    (via le `group_id` dénormalisé) ; l'auteur est porté par le `feed_item` parent.
  - `reactions` : `SELECT`/`INSERT` si `is_group_member(group_id)` ; `author_id =
    auth.uid()` ; `DELETE` réservé à l'auteur.
- **Adhésion par code** : une RPC `join_group_by_code(code text)` en
  `SECURITY DEFINER` valide le code d'invitation puis insère la ligne `MEMBERSHIPS`
  côté serveur. C'est le **seul** chemin d'entrée dans un groupe — on n'autorise
  jamais un `INSERT` client arbitraire sur `MEMBERSHIPS`.
- **Stockage des photos** : bucket **privé**, chemins préfixés par `group_id`,
  politiques Storage répliquant `is_group_member`, accès par **URLs signées**.
- **Index** : `memberships(user_id, group_id)` et `memberships(group_id, user_id)` ;
  index sur le `group_id` de chaque table de groupe.

## Conséquences

### Positives

- **Isolation au niveau base (défense en profondeur)** : même un client buggé ou
  malveillant tapant PostgREST directement ne peut pas franchir la frontière de
  groupe.
- Règle d'accès **déclarative et centralisée** dans une fonction unique, réutilisée
  par toutes les politiques.
- Couvre **tous les clients** présents et futurs (Expo aujourd'hui, éventuel natif
  demain) sans dupliquer la sécurité.
- **Testable** : l'isolation se prouve par des tests d'intégration.

### Négatives

- Coût d'évaluation RLS **par ligne** — atténué par les index, la dénormalisation du
  `group_id` (politique sans jointure) et la fonction `STABLE` (mise en cache intra-
  requête).
- **Courbe d'apprentissage** de la RLS et nécessité de tests rigoureux (rappel
  ADR-0001).
- L'adhésion impose une **RPC dédiée** au lieu d'un simple `INSERT` ; le
  `group_id` dénormalisé introduit une **redondance** à garder cohérente
  (trigger/contrainte).

### Neutres

- La couche `data/`/repository (ADR-0007) filtre aussi par groupe côté applicatif,
  mais c'est un confort d'API : **la RLS reste le filet de sécurité ultime**.
- La RLS ne dispense pas de valider les entrées (longueurs, types, codes) ; elle
  gère l'**autorisation d'accès**, pas la validation métier.

## Confirmation

- RLS **activée** et au moins une politique **testée** sur chaque table contenant des
  données de groupe ; revue d'architecture + vérification CI qu'aucune table de
  groupe n'a la RLS désactivée.
- Des tests d'intégration prouvent qu'un membre du groupe A ne peut **ni lire ni
  écrire** les données du groupe B (feed, détails, réactions, appartenances, photos).
- L'entrée dans un groupe se fait **uniquement** via `join_group_by_code` ; aucun
  `INSERT` direct sur `MEMBERSHIPS` n'est autorisé par les politiques.
- La cohérence du `group_id` dénormalisé sur les tables de détail est garantie par
  trigger/contrainte.

## Avantages et inconvénients des options

### Option 1 — Fonction helper `SECURITY DEFINER` (retenue)

- Bon : règle centralisée et réutilisable ; **pas de récursion** sur `MEMBERSHIPS` ;
  politiques simples et indexables ; évolutive (un seul point à modifier).
- Mauvais : une fonction et la dénormalisation du `group_id` à maintenir.

### Option 2 — Sous-requête `EXISTS` inline dans chaque politique

- Bon : pas de fonction à créer ; logique explicite dans chaque politique.
- Mauvais : la même sous-requête **dupliquée** partout (dérive et erreurs) ; risque
  de **récursion** sur `MEMBERSHIPS` ; modification = retoucher toutes les politiques.

### Option 3 — Isolation applicative seule (pas de RLS)

- Bon : simple à écrire côté code client.
- Mauvais : **aucune protection** si l'on interroge PostgREST directement — or
  Supabase l'expose ; un bug applicatif = fuite inter-groupes. Contraire à la
  promesse de l'ADR-0001. **Rédhibitoire.**

### Option 4 — Schéma / base par groupe

- Bon : isolation physique maximale.
- Mauvais : **sur-ingénierie manifeste** ; gérer des milliers de schémas, migrations
  multipliées, requêtes multi-groupes (un user dans N groupes) ingérables ;
  inadapté à un dev solo.

## Pour aller plus loin

- ADR-0001 — Supabase et la RLS comme implémentation de la confidentialité par
  groupe.
- ADR-0002 — Modèle polymorphe : `group_id` porté par `FEED_ITEMS`, dénormalisé sur
  les tables de détail pour des politiques simples.
- ADR-0005 — `auth.uid()` provient du JWT émis par Supabase Auth ; les politiques en
  dépendent directement.
- ADR-0007 — La couche repository filtre par groupe côté client, en complément (non
  en remplacement) de la RLS.
- ADR-0008 — Les tables de nutrition (`MEALS`) sont soumises aux mêmes politiques par
  `group_id`.

## Mise à jour (2026-07-01) — Droits de table (GRANT) indispensables

La RLS filtre les **lignes**, mais ne donne pas l'accès à la **table** : les rôles
`authenticated` / `service_role` doivent aussi avoir les `GRANT` DML, sinon PostgREST
renvoie `permission denied for table`. En cloud Supabase ces droits sont souvent posés
par les privilèges par défaut, mais **pas en local (`supabase start`) ni en self-host** —
vérifié en lançant un vrai stack (l'app était cassée sans ça). Corrigé par la migration
**`20260630090800_grants.sql`** (idempotente : crée les rôles si absents, `grant` à
`authenticated`/`service_role`, la RLS restant le seul gate au niveau ligne). Prouvé par
un e2e réel (11/11) + le harnais RLS (15/15).

