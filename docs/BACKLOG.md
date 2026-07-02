# Sport Together — Backlog (ce qui reste à faire)

> État au **2026-07-02**. Priorités : **P0** = bloquant lancement · **P1** = attendu
> MVP · **P2** = post-MVP · **P3** = confort/polish. Ce qui est fait est dans le
> [CHANGELOG](./CHANGELOG.md).

> **Fait les 2026-07-01/02** (cf. CHANGELOG) : pivot solo-first + Twitter-like ; timeline
> perso backend ; jour de repos ; signaler/bloquer ; gestion de groupe ; abonnés/abonnements ;
> partage ; suppression de commentaire ; journée parfaite ; quitter un groupe.

## P0 — Bloquants avant un vrai lancement

- [x] **Écran Compte** : déconnexion + **suppression de compte** — UI + câblage faits.
- [x] **Signaler + Bloquer (App Store 1.2 UGC)** ✓ : tables `reports` (write-only) +
  `blocks` (self-only, coupe les follows des deux sens par trigger), menu ⋯ sur les posts
  d'autrui (Signaler avec raison / Bloquer avec confirm), drapeau sur les commentaires,
  fil filtré des auteurs bloqués (`filterFeed`). Harnais RLS ✓.
- [ ] **Déployer sur un projet Supabase cloud** : appliquer les migrations (incl.
  `090800_grants`), activer Email + `{{ .Token }}`, configurer Storage. Script turnkey
  prêt (`supabase/apply-migrations.sh`).

## P1 — Attendu pour le MVP

- [ ] **Notifications push reçues** : câbler `expo-notifications` côté client
  (permission, enregistrement du token → table `device_tokens`, deep-link à l'ouverture).
  Le backend (`notify_group`, `nudge`) existe.
- [ ] **Feed temps réel** : implémenter `FeedRepository.subscribe` via Supabase Realtime
  (aujourd'hui pull + pull-to-refresh).
- [ ] **Sign in with Apple** : prévu ADR-0005, non implémenté (seul le magic-link e-mail l'est).
- [x] **Upload photo-preuve** ✓ (pipeline complet : picker + upload + attach_photo
  anti-forgerie + URLs signées + purge). Reste : compression client (expo-image-manipulator).
- [x] **Supprimer un post / goal** : bouton sur ses propres posts (feed + profil), confirm,
  `FeedRepository.deletePost` (RLS `feed_items_delete`, cascade détails/réactions/commentaires).
- [ ] **Câbler/déployer les Edge Functions** : `notify_group` (trigger pg_net), `nudge`
  (throttle 12h), `delete_account`. Écrites + lint OK, pas déployées.

## P2 — Post-MVP (gamification & social, cf. ADR-0009)

- [x] **Célébration de progression** : overlay après un log qui fait monter de niveau /
  franchir un palier d'arbre (`celebrationFor` pur + `CelebrationOverlay`) ✓.
- [x] **Quêtes hebdo perso** : dérivées du feed (`weeklyQuests`), bande sous le LevelHeader ✓.
  Reste : persister l'état « récompensé » (aujourd'hui recalculé à la volée).
- [x] **Arbre de compétences** : déblocage topologique réel (respecte `requires`) + non
  farmable (jours distincts) ✓. Reste : autres arbres, matérialisation `skill_nodes`.
- [ ] **Quêtes d'entraide réelles** (groupe) : tables `quests` + écran (« aider Léa à 15
  tractions »), XP de mentor. Aujourd'hui carte « Bientôt ».
- [x] **Abonnements (`follows`)** : table + repo + Suivre persistant + onglet Abonnements +
  écran **Découvrir** ✓. **Visibilité RLS ✓** (`follow_feed_visibility` : `is_followed`/
  `can_see_item` — les posts + détails + réactions + commentaires + profil d'un auteur suivi
  HORS groupe commun sont visibles ; isolation préservée, harnais RLS **16/16**).
- [x] **Timeline perso backend** ✓ (migration `solo_timeline`) : `group_id` **nullable**,
  RPC `log_*` acceptent null, triggers sync/freeze/notify null-safe, FK simple d'intégrité
  sur les tables enfants, **réagir/commenter partout où l'on voit le post** (`can_see_item`).
  Post solo visible par l'auteur + ses abonnés seulement — harnais RLS **18/18**. Le client
  Supabase publie en solo (plus de « bientôt »).
- [~] **Commentaires** : écran Réponses + compteur + tables/RLS ✓ (mock complet). Reste :
  temps réel + notifications de réponse.
- [ ] **Arbres de compétences** : au-delà de Muscu → Souffle, Hygiène de vie, Esprit/Lecture.
  Modèle `skill_nodes` / `user_skill_progress` à matérialiser (aujourd'hui dérivé du feed).
- [ ] **Radar de compétences** : brancher sur de vraies données de compétences (aujourd'hui
  proxy dérivé des types de goals).
- [ ] **Import des pas via Apple Health** (Phase 2 vision) — aujourd'hui saisie manuelle.
- [ ] **Objectifs hebdo négociés / défis / point collectif** (Phase 2 vision).
- [ ] **Saisons** (remise à zéro douce type piscine 42) + titres conservés.

## P3 — Confort & polish

- [ ] **Passe designer** (ami du porteur) sur la DA une fois le pré-MVP lancé.
- [ ] **Skeletons animés** (pulse) + **pulse animé** du nœud « available » (Reanimated).
- [ ] **Cover images cinématiques** réelles sur les profils (vs dégradé).
- [ ] **Migrer `shadow*` → `boxShadow`** (warning de dépréciation web, cosmétique).
- [ ] **Script de re-seed réutilisable** committé (sans clés en dur, lit `supabase status`).
- [ ] **CI** : ajouter un job e2e contre un Supabase éphémère (aujourd'hui : quality +
  db-tests RLS + edge-functions lint).

## Reliquat de la grande autocritique du 2026-07-02 (findings non bloquants)

- [ ] **Worker de purge photos** : `photo_purge_queue` est alimentée (suppression de post,
  remplacement de photo) mais pas encore drainée — Edge Function service-role schedulée
  (pg_cron/pg_net) qui `storage.remove` par lots ; purger aussi les photos dans
  `delete_account`. (Les limites de bucket — 5 Mo, jpeg/png/webp — sont en place.)
- [ ] **DST / fuseaux historiques** : les clés de jour utilisent l'offset ACTUEL du device
  sur des timestamps passés — au changement d'heure, streak/XP/tendances peuvent bouger
  d'un jour aux frontières de nuit. Résoudre l'offset PAR timestamp (Intl.DateTimeFormat).
- [ ] **XP sensible à la magnitude** : proratiser les pas (`min(1, steps/4000)`), exiger un
  contenu utile pour l'XP repas — SANS formulation punitive dans l'UI (garde-fous TCA).
- [ ] **Composer en vraie modal sheet** (Modal pageSheet iOS) — aujourd'hui : look sheet
  (poignée + coins 28) dans la pile.
- [ ] **Realtime** sur le rail « En ce moment » (aujourd'hui : dérivé du fil, <1 h).

## Dette / à surveiller

- Le mode **mock** est le défaut de dev (faux user) ; ne pas oublier de tester
  régulièrement contre le **Supabase réel** avant un jalon (un vrai bug de grants a déjà
  été attrapé ainsi — cf. CHANGELOG / migration `090800`).
- `app/preview.tsx` est une **route de dev** (captures) — à retirer ou garder derrière un flag
  avant prod.
