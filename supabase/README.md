# Supabase — schéma & migrations

Socle de données de Sport Together. Les migrations matérialisent les décisions
des ADR : feed polymorphe (ADR-0002), isolation multi-tenant par RLS et RPC
d'adhésion (ADR-0004), identité & anonymisation (ADR-0005), nutrition avec
garde-fous structurels (ADR-0008).

## Migrations (ordre d'application)

Les 23 migrations s'appliquent **dans l'ordre chronologique** du nom de fichier.

| Fichier | Contenu |
|---|---|
| `20260630090000_core_schema.sql` | Types, tables, index, fonctions d'autorisation, triggers |
| `20260630090100_rls_policies.sql` | Row Level Security : une politique testée par table de groupe |
| `20260630090200_rpc_groups.sql` | `create_group`, `join_group_by_code` (seuls chemins d'écriture sur `memberships`) |
| `20260630090300_storage_photos.sql` | Bucket privé `feed-photos` + politiques par `group_id` et auteur (chemin `<group_id>/<uid>/<feed_item_id>/<fichier>`) |
| `20260630090400_rpc_log_goals.sql` | RPC atomiques `log_session` / `log_steps` / `log_meal` (entrée de feed + détail en une transaction, avec re-check d'appartenance) |
| `20260630090500_notifications.sql` | Table `device_tokens` (push) + hook de notification de groupe |
| `20260630090600_invite_hardening.sql` | Durcissement des invitations : rotation + expiration du code (`rotate_invite_code`) |
| `20260630090700_review_fixes.sql` | Correctifs issus de la revue de sécurité (défense en profondeur RLS/triggers) |
| `20260630090800_grants.sql` | **Droits DML** aux rôles `authenticated`/`service_role` + privilèges par défaut — **sans quoi l'app est cassée sur un vrai backend** (« permission denied »). |
| `20260701090900_follows.sql` | Abonnements (`follows`) + RLS (chacun gère ses propres abonnements) — solo-first |
| `20260701091000_comments.sql` | Commentaires (`comments`, mirroir de `reactions`) + RLS par membre |
| `20260701091100_profile_bio.sql` | Colonne `profiles.bio` (bio libre du profil) |
| `20260701091200_follow_feed_visibility.sql` | Visibilité « Abonnements » : la RLS expose les posts/détails/réactions/commentaires/profil des **auteurs suivis** (helpers `is_followed`/`can_see_item`), isolation préservée |
| `20260701091300_nudge_throttle_atomic.sql` | Throttle des relances **atomique** : bucket 12h + index UNIQUE `(sender, target, bucket)` (Edge `nudge` en `ON CONFLICT`, anti-TOCTOU) |
| `20260701091400_solo_timeline.sql` | **Timeline perso** : `group_id` nullable (post solo visible auteur + abonnés), RPC `log_*` null-safe, triggers réécrits, réactions/commentaires via `can_see_item` |
| `20260702092000_rest_type.sql` | **Jour de repos** : enum `rest` + RPC `log_rest` (idempotente par jour) — le streak est protégé (vision §8) |
| `20260702092100_group_invite_access.sql` | RPC `get_group_invite` : le code d'invitation redevient consultable par les MEMBRES |
| `20260702092200_reports_blocks.sql` | **Modération UGC (App Store 1.2)** : `reports` (write-only) + `blocks` (self-only, trigger qui coupe les follows des deux sens) |
| `20260702092400_sleep_type.sql` | **Sommeil** : type `sleep` + `sleep_logs` (heures) + RPC `log_sleep` |
| `20260702092500_photo_pipeline.sql` | **Photos** : chemins solo, RPC `attach_photo` anti-forgerie, file de purge, bucket public `avatars` |
| `20260702092600_public_groups_search.sql` | **Groupes publics** (visibility, annuaire, join sans code) + `search_profiles` (annuaire de pseudos limité) |
| `20260702092300_rpc_rate_limits.sql` | **Anti-abus** : `check_rate_limit` (bucket atomique) sur `create_group` (10/12h), `join_group_by_code` (20 tentatives/12h, réponse vide pour invalide/expiré — comptée et sans oracle) et `log_*` (30/h) |

## Appliquer

**Option A — Supabase CLI (recommandé)**
```bash
# une fois le projet créé sur supabase.com :
supabase init           # si pas déjà fait (crée supabase/config.toml)
supabase link --project-ref <ref-du-projet>
supabase db push        # applique les migrations de supabase/migrations/
```

**Option B — éditeur SQL**
Coller le contenu de chaque migration, dans l'ordre, dans le SQL Editor du
dashboard Supabase.

## Tests automatisés (isolation RLS / RPC)

`supabase/tests/` contient une suite qui applique les migrations sur un PostgreSQL
nu (via des *shims* `auth`/`storage`) et **exécute** des assertions d'isolation en
simulant des utilisateurs authentifiés (rôle `authenticated` + claim JWT `sub`).

```bash
brew install postgresql@16   # une fois
npm install
npm run test:db              # monte une base jetable, applique tout, lance les tests
```

Couvre : isolation lecture/écriture inter-groupes, immuabilité du `group_id`,
adhésion par RPC uniquement (INSERT direct refusé), `author_id` non forgeable,
age-gating nutrition serveur, réactions réservées aux membres. Tourne aussi en CI
(job `db-tests`, service Postgres). *Ces tests ont déjà détecté un vrai bug
(`join_group_by_code` : collision de nom de colonne) que les revues par lecture
avaient manqué — d'où leur intérêt.*

## Garanties à vérifier après application (rappel ADR-0004)

- Un membre du groupe A ne lit/écrit **rien** du groupe B (feed, détails,
  réactions, appartenances, photos).
- L'entrée dans un groupe se fait **uniquement** via `create_group` /
  `join_group_by_code` ; aucun `INSERT` direct sur `memberships`.
- Aucune table de groupe n'a la RLS désactivée.

## Garde-fous nutrition inscrits dans le schéma (ADR-0008)

- `meals` ne contient **aucune** colonne de poids ni de cible/déficit calorique.
- Aucune vue/route n'expose de **classement calorique** entre membres.

## Durcissements recommandés avant lancement public

Une revue de sécurité adversariale (multi-agents) confirme l'**isolation
inter-groupe**. Restent des durcissements non bloquants (intra-groupe /
opérationnels) à traiter avant ouverture publique :

- **Anti brute-force du code d'invitation** : throttling de `join_group_by_code`
  (table de tentatives ou rate-limit côté Edge) + rotation/expiration du code
  (`groups.expires_at`).
- **Lien Storage ↔ feed_item** : contraindre une photo à un `feed_item` réel et
  possédé par l'auteur, et nettoyer l'objet Storage à la suppression du
  `feed_item` (Edge Function `service_role`).
- **Confidentialité intra-groupe des photos** : valider que le 2e segment du
  chemin (`uid`) est bien membre du groupe.

## Conventions client (ADR-0007)

Ces tables ne sont jamais requêtées depuis la présentation : seules les
implémentations de repository de `data/` (et le client de `core/supabase/`)
touchent Supabase.
