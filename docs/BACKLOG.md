# Sport Together — Backlog (ce qui reste à faire)

> État au **2026-07-01**. Priorités : **P0** = bloquant lancement · **P1** = attendu
> MVP · **P2** = post-MVP · **P3** = confort/polish. Ce qui est fait est dans le
> [CHANGELOG](./CHANGELOG.md).

## P0 — Bloquants avant un vrai lancement

- [ ] **Écran Compte** : déconnexion + **suppression de compte** (exigence Apple/RGPD).
  Les méthodes existent déjà (`AuthRepository.signOut` / `deleteAccount`, Edge Function
  `delete_account`), il manque l'UI et le câblage.
- [ ] **Déployer sur un projet Supabase cloud** : appliquer les migrations (incl.
  `090800_grants`), activer Email + `{{ .Token }}`, configurer Storage. Script turnkey
  prêt (`supabase/apply-migrations.sh`).

## P1 — Attendu pour le MVP

- [ ] **Notifications push reçues** : câbler `expo-notifications` côté client
  (permission, enregistrement du token → table `push_tokens`, deep-link à l'ouverture).
  Le backend (`notify_group`, `nudge`) existe.
- [ ] **Feed temps réel** : implémenter `FeedRepository.subscribe` via Supabase Realtime
  (aujourd'hui pull + pull-to-refresh).
- [ ] **Sign in with Apple** : prévu ADR-0005, non implémenté (seul le magic-link e-mail l'est).
- [ ] **Upload photo-preuve** : bouton « Ajouter une photo (bientôt) » à brancher sur
  Supabase Storage (bucket RLS par groupe, compression client, URLs signées — cf. vision §10).
- [ ] **Supprimer un goal loggé par erreur** : exposé côté UI (feed) + repo/RPC.
- [ ] **Câbler/déployer les Edge Functions** : `notify_group` (trigger pg_net), `nudge`
  (throttle 12h), `delete_account`. Écrites + lint OK, pas déployées.

## P2 — Post-MVP (gamification & social, cf. ADR-0009)

- [ ] **Quêtes d'entraide réelles** : tables `quests` + écran (« aider Léa à 15 tractions »),
  XP de mentor. Aujourd'hui carte « Bientôt ».
- [ ] **Amis inter-groupes (hybride)** : table `follows` + onglet « Amis » réel + bouton
  « Suivre » persistant (aujourd'hui local/stub).
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

## Dette / à surveiller

- Le mode **mock** est le défaut de dev (faux user) ; ne pas oublier de tester
  régulièrement contre le **Supabase réel** avant un jalon (un vrai bug de grants a déjà
  été attrapé ainsi — cf. CHANGELOG / migration `090800`).
- `app/preview.tsx` est une **route de dev** (captures) — à retirer ou garder derrière un flag
  avant prod.
