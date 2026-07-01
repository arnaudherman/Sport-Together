# Changelog — Sport Together

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/). Le projet n'est
pas encore versionné (pré-MVP) ; entrées par date. Détail des décisions dans
`docs/adr/`, cible dans `docs/VISION-ET-CADRAGE.md`, reste à faire dans `docs/BACKLOG.md`.

## [Non publié]

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
