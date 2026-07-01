# Sport Together — Vision & Cadrage

> **Statut : v1.1 — cible validée, élargie à la progression gamifiée.** Cadrage
> figé après arbitrage avec le porteur (juin-juillet 2026). C'est la source de
> vérité du *quoi* et du *pourquoi* ; les ADR couvrent le *comment*. La v1.1 acte
> l'élargissement du produit vers un **self-improvement gamifié** (progression
> personnelle + entraide, sans compétition — voir §3, §8 et ADR-0009). Tout
> changement de cap passe par une révision datée de ce document (voir le journal en
> fin de fichier).

---

## 1. Problème & intuition

On lâche plus facilement ses bonnes habitudes — sport comme alimentation — quand on
est seul. La motivation individuelle est fragile ; l'engagement envers un groupe
d'amis l'est beaucoup moins. Sport Together transforme la motivation diffuse en
engagement social concret : un petit groupe fermé d'amis où chacun voit les efforts
des autres et où personne ne veut être celui qui casse la dynamique collective.

**Hypothèse centrale à valider :** *voir les efforts de mes amis (séances et repas),
et savoir qu'ils voient les miens, me fait tenir mes bonnes habitudes plus
régulièrement.* Tout le produit existe pour tester puis exploiter cette hypothèse.

## 2. Utilisateurs cibles

- **Cercle 1 — le groupe d'amis fondateur (lancement).** Majoritairement sur iOS.
  Utilisateurs captifs, indulgents, feedback direct et honnête. C'est sur eux
  qu'on valide la rétention réelle.
- **Cercle 2 — le public (si la rétention se confirme).** Petits groupes d'amis
  qui se connaissent déjà hors de l'app. Android devient nécessaire à ce stade.

L'unité de valeur n'est jamais l'individu seul : c'est **le groupe**. Une personne
seule sur l'app n'a aucune raison de rester.

## 3. Proposition de valeur & différenciateur

Strava et consorts valorisent la performance individuelle et l'exploit. Sport
Together vise l'inverse : l'**accountability de groupe bienveillante** dans un
cercle fermé, sur l'ensemble des bonnes habitudes (mouvement *et* nutrition). Le
ressort n'est pas « regardez ce que j'ai fait », mais « on tient le rythme
ensemble, et on se relance quand l'un décroche ».

Quatre mécaniques portent ce différenciateur :

- **Le streak personnel quotidien, affiché côte à côte dans le groupe** : chacun est
  responsable du sien (il ne plombe personne), mais tous les streaks sont visibles —
  la transparence crée l'émulation.
- **La « journée parfaite » collective** : quand tous les membres ont tenu leurs
  goals du jour, le groupe la célèbre (bonus positif, jamais une épée de Damoclès).
- **Le nudge bienveillant** quand quelqu'un n'a pas encore loggé : du soutien, pas
  du blâme. C'est le cœur émotionnel du produit.
- **Les goals gamifiés** : séances/activités, pas, et nutrition (calories/macros),
  pensés comme une progression de jeu — sans jamais armer les pièges de la diet
  culture (voir §8).

**Élargissement v1.1 — la progression gamifiée (ADR-0009).** Au-delà de tenir le
rythme, le produit veut *pousser à aller plus loin* (esprit école 42 : le *holy
graph*). Trois briques, toutes **non compétitives** : (1) **XP / niveaux** dérivés
des goals loggés ; (2) des **arbres de compétences** par domaine — corps, souffle,
hygiène de vie, esprit/lecture — où l'on débloque des paliers concrets ; (3) des
**quêtes d'entraide** où l'on aide un ami à franchir un palier (« aider Léa à passer
15 tractions »), l'aidant récompensé autant que l'aidé. La progression se joue
*contre soi et la carte*, jamais dans un classement (voir §8).

## 4. La boucle d'engagement (core loop)

```
Goal du jour loggé (séance, activité, pas ou repas) → les potes le voient
   → ils réagissent (kudos / relance) → mon streak avance, la « journée
   parfaite » du groupe se construit → envie de tenir le rythme demain → (retour)
```

Tant que cette boucle n'est pas quasi-magique et sans friction, **aucune mécanique
n'est sur-développée**. La fluidité du log et la vivacité du feed priment sur la
richesse fonctionnelle.

## 5. Principes directeurs

1. **Launch-ready dès le départ** : les décisions irréversibles sont prises
   correctement maintenant ; le reste laisse des coutures propres.
2. **iOS-first**, Android comme futur certain (interop garantie par le backend).
3. **Clean & testable** : la présentation ne parle jamais au backend directement,
   toujours via des interfaces de repository.
4. **Le groupe avant l'individu** dans chaque arbitrage de design.
5. **Friction minimale au log** : si logger un goal prend plus de quelques
   secondes, la rétention s'effondre.
6. **Bienveillance non négociable** : aucune mécanique ne doit produire de
   culpabilité, de toxic-stress ou de comportement alimentaire malsain (voir §8).

## 6. Découpage en phases

| Phase | Thème | Contenu |
|-------|-------|---------|
| **1 — Noyau (MVP)** | Valider l'hypothèse | Groupes fermés multiples, log rapide d'un goal (séance/activité, pas en saisie manuelle, repas calories/macros), feed, réactions, streak personnel + journée parfaite collective, relance, notification push |
| **2 — Moteur** | Renforcer l'engagement | Objectifs hebdo négociés, point collectif, défis, nudges enrichis, import des pas via Apple Health (HealthKit) |
| **3 — Données** | Suivi de progression | Mesures personnelles, graphiques partagés au groupe, tendances nutrition |
| **4 — Ouverture** | Élargir | Distribution Android, enrichissements sociaux, contenu riche |

## 7. Scope du MVP (Phase 1) — DEDANS / DEHORS

C'est la section la plus importante du document : ce qu'on s'engage à coder, et ce
qu'on s'interdit de coder pour le premier jet.

### DEDANS (MVP)

- **Authentification** : Sign in with Apple **et** magic link e-mail (un compte =
  un provider au MVP, pas de fusion d'identités).
- **Onboarding profil minimal** : pseudo + avatar (indispensable pour un feed
  lisible — Sign in with Apple ne fournit pas toujours le nom).
- **Groupes fermés multiples** : créer / rejoindre plusieurs groupes via code
  d'invitation, avec un sélecteur / une liste de groupes. Le feed, le streak et les
  notifications sont *scopés par groupe*.
- **Log rapide d'un goal du jour**, plusieurs types :
  - **séance / activité sportive** (type, durée, photo-preuve optionnelle) ;
  - **pas** (saisie manuelle au MVP — l'auto via Apple Health viendra en Phase 2) ;
  - **repas** avec **calories et macros** (saisie manuelle ; la base d'aliments
    démarre légère et s'enrichira — voir note d'implémentation §10).
- **Feed du groupe** : les goals de tous les membres, du plus récent au plus ancien.
- **Réactions** sur un goal (kudos / encouragement).
- **Streak personnel quotidien** affiché côte à côte dans le groupe + **« journée
  parfaite » collective** célébrée quand tous ont tenu leurs goals. Pas de casse
  collective : un membre qui loupe ne fait perdre le streak de personne.
- **Filet santé** : les activités douces (marche, mobilité, repos actif) comptent ;
  les jours de repos ne cassent pas l'assiduité.
- **Relance / nudge** : quand un membre n'a pas encore loggé, le groupe le voit et
  peut l'encourager.
- **Notification push** : « X vient de logger » + relances.
- **Suppression** d'un goal loggé par erreur **et suppression de compte** (exigence
  Apple/RGPD).
- Pas de rôle administrateur ; le créateur d'un groupe n'a pas de privilège spécial.

### DEHORS (reporté aux phases suivantes, assumé)

- Import automatique des pas via **Apple Health / HealthKit** → Phase 2 (au MVP,
  saisie manuelle).
- **Objectifs hebdomadaires négociés, défis, point collectif** → Phase 2.
- Mesures personnelles, graphiques de progression, tendances nutrition → Phase 3.
- Import Strava / autres sources d'activité → Phase 2+.
- **Android** (le code reste Android-ready, build maintenu, mais non distribué) →
  post-validation.
- Monétisation, profils publics, découverte de groupes inconnus.

## 8. Garde-fous & anti-objectifs (ce qu'on refuse explicitement)

> **Changement de cap acté en v1.0 :** la v0.1 faisait de la nutrition un
> anti-objectif (« ne pas devenir une app de nutrition »). Le porteur a
> **délibérément rouvert ce garde-fou** : la nutrition chiffrée (calories/macros)
> entre dans le périmètre, **à la condition stricte** des garde-fous de sécurité
> ci-dessous, qui remplacent l'ancien interdit.

> **Précision v1.1 (gamification, ADR-0009) :** l'interdit « pas de comparaison
> compétitive » ci-dessous **reste entier**. XP, niveaux et arbres de compétences
> sont de la **progression personnelle** (contre soi et la carte) — jamais un
> classement, ni mondial ni entre amis. Le levier social est l'**entraide**
> (récompensée), pas la rivalité. Toute mécanique qui trierait les membres « du
> meilleur au moins bon » est proscrite au même titre que le leaderboard calorique.

On refuse explicitement :

- **Tout objectif de poids** et tout déficit calorique agressif ; aucune cible
  nutritionnelle sous un seuil sain.
- **Tout classement ou comparaison nutrition chiffrée entre membres** (le
  leaderboard calorique est le vecteur le plus toxique — proscrit).
- **Tout cadrage culpabilisant** : pas de « tu as dépassé », pas de punition. Le
  langage reste positif ; le streak n'est jamais une arme.
- **La valorisation de la performance individuelle** ou la comparaison compétitive
  entre amis (l'app célèbre la régularité collective, pas l'exploit).
- **Le toxic-stress** : aucune mécanique où un membre fait « perdre » les autres.
- **Tout ce qui pousse à des comportements alimentaires malsains** ; cadrage
  anti-TCA, app **réservée aux adultes** (age-gating).
- **Ajouter une mécanique avant que la boucle core ne soit prouvée** sur le groupe
  fondateur.

## 9. Définition de « ça marche »

On considère l'hypothèse validée si, sur le groupe fondateur, après 4 à 6 semaines :

- une majorité des membres logge des goals chaque semaine sans qu'on ait à le
  rappeler ;
- les goals déclenchent des réactions et des relances (le feed est vivant) ;
- les streaks personnels et les journées parfaites collectives se maintiennent sur
  plusieurs semaines ;
- les membres rouvrent l'app spontanément (rétention, pas curiosité initiale).

Si ces signaux sont absents, on retravaille la boucle core avant d'ajouter quoi
que ce soit.

## 10. Décisions actées & décisions ouvertes

### Actées (v1.0 / v1.1)

- **Backend** : Supabase (PostgreSQL, Auth, Realtime, Storage, RLS) — ADR-0001.
- **Modèle de feed polymorphe** (`FEED_ITEMS` + détails) — ADR-0002. Les types de
  goals (séance, activité, pas, repas) sont chacun une table de détail reliée à
  `FEED_ITEMS` ; ajouter un type reste additif.
- **Client** : Expo / React Native, iOS-first — ADR-0003.
- **Multi-tenant** : un utilisateur appartient à plusieurs groupes (modèle
  `MEMBERSHIPS` n-à-n, UI multi-groupe complète au MVP). RLS par appartenance —
  détail dans ADR-0004.
- **Identité** : Sign in with Apple + magic link e-mail dès le MVP ; un compte = un
  provider — détail dans ADR-0005.
- **Streak** : personnel et quotidien, affiché côte à côte ; journée parfaite
  collective célébrée en bonus ; pas de casse collective ; filet santé (activités
  douces et jours de repos tolérés).
- **Nutrition** : suivi calories/macros dès le MVP, sous les garde-fous §8.
- **Photos** : Supabase Storage, compression côté client (~1080 px, JPEG ~0,7),
  bucket protégé par RLS par groupe, accès par URLs signées.
- **Gamification (v1.1)** : progression personnelle (XP / niveaux / arbres de
  compétences) + quêtes d'entraide coopératives, **sans classement compétitif** —
  ADR-0009. DA « dark cinématique » associée dans `docs/DESIGN-SYSTEM.md`.

### Notes d'implémentation (non bloquantes)

- La nutrition « calories/macros » démarre en **saisie manuelle** avec une liste
  d'aliments qui s'enrichit ; la base alimentaire complète et le scan code-barres
  sont des enrichissements ultérieurs, pas un prérequis du MVP.
- La règle exacte du streak (fenêtre horaire de la « journée », deadline de
  rattrapage, nombre de jours de repos tolérés) est calée à l'implémentation, dans
  l'esprit « bienveillant » ci-dessus.

### Ouvertes (hors périmètre de ce document)

- Détail des politiques Row Level Security par groupe → ADR-0004.
- Stratégie de notifications push (Expo Notifications) → ADR-0006.
- Découpage en couches du client (repositories + DI) → ADR-0007.

## 11. Registre des ADR

| ID | Titre | Statut |
|----|-------|--------|
| ADR-0001 | Backend — Supabase | **accepté** |
| ADR-0002 | Modèle de feed polymorphe (`FEED_ITEMS`) | **accepté** |
| ADR-0003 | Framework client — Expo/React Native, iOS-first | **accepté** |
| ADR-0004 | Isolation multi-tenant & Row Level Security | **accepté** |
| ADR-0005 | Authentification & identité | **accepté** |
| ADR-0006 | Notifications push (Expo Notifications) | **accepté** |
| ADR-0007 | Architecture client en couches (repositories + DI) | **accepté** |
| ADR-0008 | Nutrition : modèle de données & garde-fous | **accepté** |
| ADR-0009 | Gamification & progression (XP, niveaux, arbres, entraide) | **accepté** |

> **Note :** la nutrition fait l'objet d'un ADR dédié (ADR-0008 : modèle de données
> calories/macros + garde-fous TCA), vu sa centralité au MVP et sa sensibilité. Le
> modèle de streak reste couvert par ce document et calé à l'implémentation, sans
> ADR dédié.

---

## Journal des révisions

- **v1.1 (2026-07-01)** — Élargissement assumé vers un **self-improvement gamifié**.
  Décisions : gamification par **progression personnelle** (XP, niveaux, arbres de
  compétences) + **quêtes d'entraide** coopératives, **sans classement compétitif**
  (ADR-0009) ; réconciliation explicite du §8 (les XP/niveaux ne sont pas de la
  comparaison compétitive) ; modèle social **hybride** (groupe fermé au cœur + amis
  inter-groupes opt-in) ; DA « dark cinématique » (`docs/DESIGN-SYSTEM.md`). Les
  ADR-0004 à 0008 sont passés à *accepté* (rédigés et committés).
- **v1.0 (2026-06-30)** — Cible validée après arbitrage avec le porteur. Décisions :
  multi-groupe complet ; auth SiwA + magic link ; streak personnel + journée
  parfaite collective (non punitif) ; goals multi-types (séance/activité, pas
  manuels, repas calories/macros). **Réouverture assumée du garde-fou nutrition**
  (de l'anti-objectif vers un périmètre encadré par des garde-fous de sécurité).
  Photos sur Supabase Storage avec compression client.
- **v0.1** — Brouillon de cadrage initial.

*Prochaine étape : construire la 1ʳᵉ tranche gamifiée (arbre Muscu + quêtes
d'entraide) et brancher un projet Supabase réel pour valider la boucle sur le
groupe fondateur.*
