# Changelog — Sport Together

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/). Le projet n'est
pas encore versionné (pré-MVP) ; entrées par date. Détail des décisions dans
`docs/adr/`, cible dans `docs/VISION-ET-CADRAGE.md`, reste à faire dans `docs/BACKLOG.md`.

## [Non publié]

### 2026-07-02 — Grande autocritique finale (28 agents) : 12 findings corrigés dont une fuite RLS

- **FUITE CORRIGÉE (haute)** : suivre quelqu'un (unilatéral) ouvrait TOUS ses posts, y
  compris ceux de ses **groupes privés** (macros de repas comprises) — et l'annuaire
  `search_profiles` rendait l'attaque triviale. Le follow n'expose plus que la **timeline
  perso** (posts solo) ; les posts de groupe restent réservés aux membres (migration
  `fix_follow_leak`, harnais réécrit qui verrouille le bon sens).
- **Photos réparées sur device natif** : `fetch().blob()` ne marche pas en RN avec
  storage-js → **ArrayBuffer** ; échec photo devenu **non-fatal** (le post reste publié,
  alerte + pas de doublon) ; avatar en **chemin fixe + upsert** (fini l'accumulation
  publique) ; **limites de bucket** (5 Mo, jpeg/png/webp) ; `attach_photo` met l'ancienne
  photo en file de purge.
- **Célébration ressuscitée** : elle mourait à 11 jours (snapshot plafonné par l'ancien
  arbre Muscu) — snapshots **par domaine de vie** (`progressSnapshot`), tous les paliers
  célèbrent (« Le pli est pris » à 15 j, « Première nuit suivie »…) ; `skill-graph`
  supprimé (plus aucun consommateur).
- **XP cohérent** : le bonus régularité utilise les MÊMES primitives que le streak affiché
  (repos borné 2/7) — poster uniquement des repos ne construit plus de bonus.
- **DA** : PrimaryButton en dégradé accent + ombre, composer en look sheet (poignée, coins
  28, module récompense Surface+Ring+chiffre ultra-light, chips sans bordure au repos,
  Ionicons), cartes du groupe sans bordure dure, avatars photo partout (en-tête accueil,
  composer, membres du groupe, suggestions), onglet **Médias** en vraie grille de photos.
- **UX** : recherches **débouncées** (350 ms) + `list_public_groups` rate-limité ; méta de
  groupe chargées avant d'ouvrir l'écran (isCreator correct après création) ; la section
  Groupes du profil n'apparaît que sur SON profil.
- Reliquat tracé au backlog (worker de purge, DST, prorata pas, vraie modal, realtime).

### 2026-07-02 — Refonte « Obsidienne » + sprint produit (target redéfinie avec le porteur)

- **Nouvelle DA verrouillée** : sport premium Whoop nocturne (maquette
  `docs/mockups/target-a-obsidienne.html` fait foi ; Design Book v2). Tab bar native
  (Accueil/Découvrir/＋/Groupes/Profil), Surfaces sans bordure, anneaux de données,
  chiffres ultra-light, photos partout (posts, covers, avatars).
- **XP v2 anti-facile** : décroissance par type/jour (100/50/20/0 %), plafond 120/jour,
  bonus variété (+15) et régularité (+10 % à 7 j, +20 % à 30 j), XP réel affiché PAR post.
- **Sommeil** : type `sleep` (chip 🌙, heures) — 5 domaines de qualité de vie.
- **Arbre de vie** : Sport/Pas/Sommeil/Nutrition/Rythme, paliers en jours distincts
  (non farmables), rails + anneaux ; célébration branchée sur les paliers Sport.
- **Graphiques auto** : TrendChart (XP · 14 jours) alimenté par tout ce qu'on logge.
- **Photos bout-en-bout** : composer (picker + préview), upload + `attach_photo`
  anti-forgerie, URLs signées en lot, purge à la suppression ; **photo de profil**
  (bucket public avatars) et avatars réels dans tout le fil.
- **Groupes publics/privés** au choix du créateur + **annuaire** + join sans code ;
  **recherche de gens** (`search_profiles`) ; rail **« En ce moment »** sur l'accueil.
- Harnais RLS : **23 → 26 tests** (photos, sommeil, groupes publics/recherche — dont une
  SURCHARGE de `create_group` attrapée) ; front **97 tests** ; **22 migrations**.

### 2026-07-02 — Analyse d'écarts (19 agents, contre-vérifiée) : 10 manques comblés

- **Timeline perso backend** : publier en SOLO pour de vrai (`group_id` nullable, RPC
  null-safe, triggers réécrits, réactions/commentaires partout où l'on voit le post).
- **Jour de repos** 😴 : type de feed `rest` (+10 XP), chip dans le composer, **streak
  protégé** (borne anti-farm 2 repos/7 j), présence groupe et journée parfaite en profitent.
- **Signaler + Bloquer (P0 App Store 1.2)** : `reports` write-only + `blocks` (coupe les
  follows des deux sens), menu ⋯ sur les posts d'autrui, drapeau sur les commentaires,
  fil filtré des bloqués.
- **Gestion de groupe** : code d'invitation re-consultable (`get_group_invite`), vrai nom
  en titre, régénérer le code / renommer / supprimer (créateur), composant partagé
  `InviteCodeActions` ; **quitter un groupe**.
- **Abonnés / abonnements** : compteurs cliquables sur son profil + écran liste
  (`listFollowers` — la RLS exposait déjà les deux côtés).
- **Partager une publication** (icône share) · **supprimer son commentaire** (poubelle
  optimiste + RLS) · **journée parfaite** enfin branchée (bannière ✨ + 7 jours d'étoiles).
- **Anti-abus RPC** : `check_rate_limit` atomique — create_group 10/12 h, join 20
  tentatives/12 h (réponse vide pour code invalide/expiré : la tentative **reste comptée**
  — le test du harnais a attrapé le rollback du compteur — et plus d'oracle), log_* 30/h.
- Harnais RLS : **17 → 23 tests**, front **84 tests**, 19 migrations.

### 2026-07-01 — Timeline perso (backend) : publier en solo, pour de vrai

- **`group_id` nullable** sur `feed_items` (+ tables enfants) : un post solo n'a pas de
  groupe ; il est visible par **l'auteur + ses abonnés seulement** (un co-membre de groupe
  non abonné ne le voit pas — solo = fil perso). RPC `log_*` acceptent `p_group_id null`.
- **Triggers réécrits null-safe** : sync (`found` au lieu de la sentinelle `is null`),
  freeze (`is distinct from`), notify (post solo → pas de notification de groupe).
- **FK simple d'intégrité** ajoutée aux 5 tables enfants (la FK composite MATCH SIMPLE
  n'est pas appliquée quand `group_id` est null).
- **Réagir / commenter partout où l'on voit le post** (`can_see_item`) : débloque les
  réactions des abonnés sur les posts solo ET sur les posts de groupe des auteurs suivis.
- Client Supabase : `logSession/logSteps/logMeal(null)` **publient** (fin du « bientôt »).
- Prouvé sur le harnais : **18/18** (nouveau test « timeline perso » : auteur ✓, co-membre
  ✗, abonné ✓ + réaction + commentaire, unfollow ✗) — toute l'isolation existante tient.

### 2026-07-01 — Maintenabilité : mutualisation (dette de l'audit qualité)

- **`useAsyncData`** : hook mutualisant le cycle *mounted-ref + load + loading/erreur +
  reload*, adopté dans **feed-view / profil / groupe / découvrir** (~120 lignes de
  boilerplate dupliqué en moins ; le bug latent de garde de démontage devient impossible).
- **`FollowButton`** : composant self-contained (charge son état + toggle optimiste) —
  supprime la duplication du bouton Suivre entre profil et Découvrir.
- **`Avatar`** + **`ScreenHeader`** : composants partagés (cercle-avatar déterministe ×5,
  en-tête « ‹ Retour » ×3 avec largeurs homogénéisées).
- **`SupabaseFeedRepository.listFeed(filter?)`** : les 3 quasi-clones
  `listHome/Group/UserFeed` factorisés en une méthode (filtre typé, sans `any`).
- Comportement inchangé partout — gate vert (78 tests + 17 RLS + bundle).

### 2026-07-01 — Durcissements sécurité backend (Edge Functions)

- **`nudge`** : throttle anti-harcèlement rendu **atomique** (index UNIQUE sur un bucket de
  12h → `INSERT ... ON CONFLICT DO NOTHING`, fini le TOCTOU SELECT-puis-INSERT), + **plafond
  global par cible** (≤ 3 relances reçues/12h tous émetteurs confondus, contre le harcèlement
  coordonné), + **validation UUID** des entrées (payload malformé → 400, plus 500). Migration
  `nudge_throttle_atomic` + test au harnais (**17/17** : doublon même fenêtre refusé).
- **`notify_group`** : ne fait plus confiance au `group_id`/`author_id` du payload (un
  détenteur du secret pouvait spammer un groupe arbitraire) — la fonction **relit la ligne
  `feed_items` réelle** via `feed_item_id` et en tire les valeurs faisant autorité ; ligne
  inexistante → 400. `deno check` + `deno lint` OK.

### 2026-07-01 — Améliorations UX (parcours & premier lancement)

- **Navigation par pile** : Retour revient à l'écran précédent (profil → post → Retour
  = profil, plus l'accueil) ; **bouton retour Android** recule d'un cran (`BackHandler`).
- **Premier lancement** : l'onboarding enchaîne directement sur la **1re publication** ;
  l'accueil vide devient une **carte de bienvenue** (payoff + « Publier ma première
  séance ») au lieu d'un mur de zéros ; copie d'onboarding réalignée solo-first.
- **Cartes du fil cliquables** : taper le corps d'un post ouvre le **thread** ; le **badge
  🔒 groupe** ouvre le groupe ; l'icône de suppression devient une **poubelle** explicite.
- **Composer** : **sélecteur de destination** (Mon fil / un groupe, défaut = Mon fil) au
  lieu d'un groupe silencieux ; **Publier désactivé** tant que le champ requis est vide ;
  avatar au vrai pseudo.
- **États vides = CTA** : Abonnements → « Découvrir des gens », Groupes → « Rejoindre un
  groupe », Découvrir sans groupe → « Rejoindre un groupe ».
- **Invitation** : **Copier / Partager** le code de groupe (expo-clipboard + Share).
- **Connexion** : « Modifier l'email » + « Renvoyer le code » sur l'étape code (plus de
  blocage sur une faute de frappe) + retour haptique.

### 2026-07-01 — Améliorations (chasse aux améliorations : produit + correction + tests)

**Produit (profondeur / rétention)**
- **Célébration** après un log qui fait monter de niveau ou franchir un palier d'arbre :
  overlay animé (le pic de récompense du core loop, jusque-là muet). `celebrationFor` pur + testé.
- **Quêtes hebdo perso** (GAMIFICATION.md) dérivées du feed, sans backend : « 3 séances »,
  « bouge 4 jours », « publie 5 fois » avec barres de progression, sous le LevelHeader.

**Correction métier + tests**

- **Arbre de compétences (skill-graph)** : déblocage **topologique réel** (respecte les
  prérequis `requires`, robuste aux prérequis multiples et à un `order` non topologique —
  fini le compteur linéaire déguisé) ; et **non farmable** (compte les **jours**
  d'entraînement distincts, plus les posts bruts). Tests DAG + dédup jour.
- **Nutrition (`validateMeal`)** : borne macro par repas réaliste (5000 → **500 g**),
  **cohérence souple énergie↔macros** (±40 %, seulement si tout est fourni), et refus des
  **libellés visuellement vides** (espaces zéro-largeur). Tests neufs.
- **Réactions optimistes** : logique pure extraite (`domain/usecases/reaction-toggle.ts`)
  avec **clamp ≥ 0** (plus de compteur négatif) + tests.
- **Filtre du fil** extrait et testé (`ui/feed-filter.ts` : Tout / Abonnements / Groupes).
- **Couverture** : premiers tests de `ui/` (`format.ts`, filtre du fil), test du **contrat
  « publier en solo »** (mock accepte / Supabase rejette). **44 → 70 tests.**

### 2026-07-01 — Polish premium + visibilité des abonnements (backend)

- **Polish (revue polish multi-agents)** : retour **haptique** (réactions, publier,
  encourager), **barre d'XP animée** (`Animated`), états **pressed** sur tous les CTA,
  **a11y** complétée (rôles/labels/état sélectionné : boutons, onglets, chips type/durée),
  **bandeau d'erreur** non bloquant pour les échecs d'action (réaction/suppression),
  **états chargement/erreur** distincts de « vide » sur les Réponses, contrastes AA
  (`textFaint`→`textMuted`), tokens `onAccent` + `font.stat` (chiffres-héros unifiés),
  vocabulaire unifié (« publication »).
- **Backend — visibilité « Abonnements »** (`follow_feed_visibility`) : la RLS expose
  désormais les posts (+ détails, réactions, commentaires, profil) des **utilisateurs
  suivis**, plus seulement ceux de tes groupes — l'onglet Abonnements fonctionne sur un
  vrai Supabase. Helpers `is_followed`/`can_see_item`. **Isolation préservée** (un non-membre
  non-abonné ne voit rien) : harnais RLS **16/16**.

### 2026-07-01 — Auto-critique (revue adversariale) + améliorations

- **14 findings corrigés** : **publier en SOLO** (plus de gate groupe obligatoire — vraie
  régression solo-first), **stats profil correctes** (`listUserFeed` au lieu d'un feed
  partiel), onglet **Abonnements** inclut tes posts, **optimistic** réactions/suppression,
  **LevelHeader** remonté sur l'accueil (rétention solo), **streak groupe** basé sur
  l'activité (plus collé à 0), commentaires (catch + message d'erreur), **a11y** (rôles,
  labels, cibles ≥ 44px), holy graph labels lisibles, composer copie solo, retrait de
  **code mort** (radar) + sentinelle mock `local-user`.
- **Découvrir** : nouvel écran de suggestions à suivre (membres de tes groupes non suivis)
  pour alimenter l'onglet Abonnements.
- **Édition de profil** (pseudo + bio) dans l'écran Compte + **vraies bios** sur les profils
  (`ProfileRepository.getProfile`, migration `bio`) — fini la bio bidon identique partout.

### 2026-07-01 — Pivot solo-first + couche sociale (Twitter-like)

- **Pivot solo-first** (ADR-0010, vision v2) : plus de groupe obligatoire ; l'**accueil**
  devient un **fil social** (Tout / Abonnements / Groupes) ; les groupes sont un **add-on
  privé** d'entraide, affichés sur le profil (badge 🔒 sur les posts de groupe).
- **Refonte type Twitter** : posts (fil & profil), profil à **onglets** (Publications /
  Compétences / Médias), **arbre de compétences en holy graph ramifié** (react-native-svg),
  écran **« Publier une séance »** (composer).
- **Abonnements** (`follows`) : suivre / ne plus suivre **persistant**, onglet
  « Abonnements » filtré (repo mock + Supabase + migration `follows` + RLS).
- **Commentaires** (Twitter-like) : écran **Réponses** (fil + composer), **compteur 💬**
  sur les posts (repo mock + Supabase + migration `comments` + RLS par membre).
- **Écran Compte** (P0 App Store) : déconnexion + suppression de compte.
- **Fix** : retrait de la **barre blanche** en haut (header de navigation désactivé).

### 2026-07-01 — Backend prouvé sur du réel + corrections

- **Vérifié de bout en bout sur un vrai Supabase** (stack local `supabase start`) :
  auth GoTrue, `create_group`/`join_group_by_code`, `log_*`, feed polymorphe, RLS
  d'isolation — **e2e 11/11** + harnais RLS **15/15**.
- **Corrigé (bug attrapé grâce au réel)** : migration **`090800_grants.sql`** — les rôles
  `authenticated`/`service_role` n'avaient pas les droits DML (`permission denied for
  table`) ; l'app aurait été cassée sur un vrai backend. La RLS reste le gate au niveau ligne.
- **Corrigé** : adaptateur de stockage de session **selon la plateforme** (SecureStore
  chiffré natif / `localStorage` web / no-op SSR) — corrige le crash au rendu web
  `ExpoSecureStore.getValueWithKeyAsync is not a function` quand Supabase est configuré.
- **Mode faux-user (mock)** : n'importe quel e-mail + code connecte, et on atterrit dans
  un groupe de démo « The Crew » **pré-seedé** (feed sur 3 jours, réactions, streaks).
- **Outillage** : route de dev `app/preview.tsx` + support web pour **captures d'écran**
  du rendu réel (voir skill `preview-screenshot`), script d'application des migrations.

### 2026-07-01 — DA « dark cinématique » + gamification

- **Design system** (`docs/DESIGN-SYSTEM.md`, `ui/theme.ts`) : DA sombre + accent orange.
- **Upgrade visuel** : dégradés (`expo-linear-gradient`) sur les cartes-héros, **vraies
  icônes** (`@expo/vector-icons`), **skeletons** de chargement, cibles tactiles ≥ 44 px.
- **Gamification (ADR-0009)** : moteur XP/niveaux (pur, testé), **arbre de compétences**
  Muscu débloquable, **radar de compétences** (SVG dérivé du feed), quêtes d'entraide
  (conception) — progression personnelle + entraide, **sans classement compétitif**.
- **Flux social** : feed vivant (présence, activité groupée par jour, réactions), écran
  **Groupe & entraide** (statuts du jour, encourager), écran **Profil** (stats, heatmap,
  radar), écran **Logger** dédié, navigation feed ↔ groupe ↔ profil ↔ progression ↔ log.
- **Critique design multi-agents** (36 findings → 10) + correctifs : états
  chargement/erreur, safe-area, chiffres-héros, accent plus rare, onboarding gamifié.
- **Docs** : `VISION` v1.1 (scope self-improvement, réconciliation §8), maquette HD du flux.

### 2026-06-30 — Cadrage + backend + scaffold

- **Cadrage** : `VISION-ET-CADRAGE.md` v1.0, **ADR-0001 à 0008** (Supabase, feed
  polymorphe, Expo/RN iOS-first, RLS multi-tenant, auth, push, archi en couches, nutrition).
- **Backend Supabase** : 8 migrations (schéma, RLS, RPC groupes/log, storage photos,
  notifications, durcissement invitations, correctifs). Trigger de gel du `group_id`,
  FK composite, RPC SECURITY DEFINER.
- **Edge Functions** (Deno) : `notify_group` (secret partagé), `nudge` (throttle 12h),
  `delete_account` (purge + anonymisation). deno check/lint OK.
- **Client Expo/RN** : architecture en couches (domain / data / ui / core) avec
  repositories + DI, implémentations Supabase **et** mocks, ESLint no-restricted-imports.
- **Tests** : 42 tests front (jest-expo), 15 tests RLS/RPC sur Postgres réel, CI (3 jobs).
- **Analyse de code** à 100 % (`docs/ANALYSE-CODE.md`, note B+) ; 9 findings high résolus.
