# Supabase — schéma & migrations

Socle de données de Sport Together. Les migrations matérialisent les décisions
des ADR : feed polymorphe (ADR-0002), isolation multi-tenant par RLS et RPC
d'adhésion (ADR-0004), identité & anonymisation (ADR-0005), nutrition avec
garde-fous structurels (ADR-0008).

## Migrations (ordre d'application)

| Fichier | Contenu |
|---|---|
| `20260630090000_core_schema.sql` | Types, tables, index, fonctions d'autorisation, triggers |
| `20260630090100_rls_policies.sql` | Row Level Security : une politique testée par table de groupe |
| `20260630090200_rpc_groups.sql` | `create_group`, `join_group_by_code` (seuls chemins d'écriture sur `memberships`) |
| `20260630090300_storage_photos.sql` | Bucket privé `feed-photos` + politiques par `group_id` et auteur (chemin `<group_id>/<uid>/<feed_item_id>/<fichier>`) |

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
