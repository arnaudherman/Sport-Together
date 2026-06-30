-- =============================================================================
-- Sport Together — Schéma de base (ADR-0002 feed polymorphe, ADR-0005 identité,
-- ADR-0008 nutrition). Les politiques RLS sont dans la migration suivante.
-- Durci après revue de sécurité adversariale (FK composite group_id, immutabilité).
-- =============================================================================

-- gen_random_uuid() est disponible nativement (pgcrypto fourni par Supabase).

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
-- Discriminateur du feed polymorphe (ADR-0002). Ajouter un type = ALTER TYPE
-- ... ADD VALUE, purement additif (ex. 'weigh_in' en Phase 3).
create type public.feed_item_type as enum ('session', 'steps', 'meal');

-- -----------------------------------------------------------------------------
-- Profils (ADR-0005) — 1-à-1 avec auth.users. L'identité métier est auth.uid().
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  pseudo     text not null check (char_length(pseudo) between 1 and 40),
  avatar_url text,
  -- Age-gating AUTO-DÉCLARATIF (ADR-0008) : simple attestation, pas une
  -- vérification d'âge. Re-vérifié côté serveur pour la nutrition (log_meal),
  -- mais le titulaire peut le passer à true via profiles_update. Une vraie
  -- vérification (date de naissance immuable, etc.) reste un TODO produit.
  is_adult   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Groupes (ADR-0004) — le créateur est le seul propriétaire de l'objet groupe.
-- created_by ON DELETE SET NULL : permet la suppression de compte du créateur
-- (ADR-0005) ; le groupe survit sans propriétaire plutôt que de la bloquer.
-- -----------------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  created_by  uuid references public.profiles (id) on delete set null,
  invite_code text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Appartenances (ADR-0004) — relation n-à-n, cœur du multi-tenant par groupe.
-- L'INSERT se fait UNIQUEMENT via RPC (aucune politique d'insert directe).
-- -----------------------------------------------------------------------------
create table public.memberships (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Colonne vertébrale du feed (ADR-0002). Porte les attributs communs.
-- author_id ON DELETE SET NULL : à la suppression de compte, le contenu reste
-- mais est anonymisé (« membre supprimé ») pour ne pas trouer le feed (ADR-0005).
-- La contrainte UNIQUE (id, group_id) est la cible des FK composites des tables
-- de détail : elle garantit que leur group_id dénormalisé ne peut JAMAIS diverger.
-- -----------------------------------------------------------------------------
create table public.feed_items (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  type       public.feed_item_type not null,
  created_at timestamptz not null default now(),
  constraint feed_items_id_group_key unique (id, group_id)
);

-- -----------------------------------------------------------------------------
-- Tables de détail (ADR-0002). group_id dénormalisé pour des politiques RLS
-- simples et indexables (ADR-0004). La FK COMPOSITE (feed_item_id, group_id) ->
-- feed_items (id, group_id) rend toute divergence du group_id structurellement
-- impossible, indépendamment des triggers et des politiques.
-- -----------------------------------------------------------------------------
create table public.sessions (
  feed_item_id uuid primary key,
  group_id     uuid not null,
  activity     text not null check (char_length(activity) between 1 and 60),
  duration_min integer check (duration_min > 0 and duration_min <= 1440),
  photo_path   text,
  created_at   timestamptz not null default now(),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade
);

create table public.step_logs (
  feed_item_id uuid primary key,
  group_id     uuid not null,
  steps        integer not null check (steps >= 0 and steps <= 200000),
  created_at   timestamptz not null default now(),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade
);

-- Nutrition (ADR-0008). GARDE-FOUS STRUCTURELS : pas de colonne de poids, pas de
-- cible/déficit calorique, aucune donnée permettant un classement entre membres.
create table public.meals (
  feed_item_id  uuid primary key,
  group_id      uuid not null,
  label         text not null check (char_length(label) between 1 and 80),
  moment        text check (moment in ('breakfast', 'lunch', 'dinner', 'snack')),
  calories_kcal integer       check (calories_kcal >= 0 and calories_kcal <= 20000),
  protein_g     numeric(6, 1) check (protein_g >= 0),
  carbs_g       numeric(6, 1) check (carbs_g >= 0),
  fat_g         numeric(6, 1) check (fat_g >= 0),
  photo_path    text,
  created_at    timestamptz not null default now(),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Réactions (ADR-0002) — positives uniquement (kudos / encouragement).
-- -----------------------------------------------------------------------------
create table public.reactions (
  id           uuid primary key default gen_random_uuid(),
  feed_item_id uuid not null,
  group_id     uuid not null,
  author_id    uuid references public.profiles (id) on delete set null,
  kind         text not null check (kind in ('kudos', 'encouragement')),
  created_at   timestamptz not null default now(),
  unique (feed_item_id, author_id, kind),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Index (ADR-0004 : performance des politiques + lectures du feed)
-- -----------------------------------------------------------------------------
create index memberships_user_idx    on public.memberships (user_id);
create index feed_items_group_idx    on public.feed_items (group_id, created_at desc);
create index feed_items_author_idx   on public.feed_items (author_id);
create index sessions_group_idx      on public.sessions (group_id);
create index step_logs_group_idx     on public.step_logs (group_id);
create index meals_group_idx         on public.meals (group_id);
create index reactions_feed_item_idx on public.reactions (feed_item_id);
create index reactions_group_idx     on public.reactions (group_id);

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (ADR-0004). SECURITY DEFINER pour lire memberships
-- sans déclencher la RLS de cette table => pas de récursion. Exécution restreinte
-- aux utilisateurs authentifiés (réduit l'oracle d'appartenance).
-- -----------------------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

-- Deux utilisateurs partagent-ils au moins un groupe ? (visibilité des profils)
create or replace function public.shares_group_with(other uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = other
  );
$$;
revoke all on function public.shares_group_with(uuid) from public;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- Code d'invitation aléatoire (10 caractères hex => ~1e12 combinaisons).
-- search_path figé + appel qualifiable pour éviter tout shadowing.
create or replace function public.gen_invite_code()
returns text
language sql
volatile
set search_path = pg_catalog, public
as $$
  select upper(substr(
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    1, 20
  ));
$$;
revoke all on function public.gen_invite_code() from public;

-- -----------------------------------------------------------------------------
-- Triggers utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

-- group_id d'un feed_item est IMMUABLE : empêche de déplacer une entrée (et son
-- fil de détail/réactions) vers un autre groupe — y compris via service_role
-- ou un chemin futur (correctif FI-1 de la revue de sécurité).
create or replace function public.freeze_feed_item_group()
returns trigger language plpgsql as $$
begin
  if new.group_id <> old.group_id then
    raise exception 'group_id d''un feed_item est immuable';
  end if;
  return new;
end;
$$;

create trigger feed_items_freeze_group
  before update on public.feed_items
  for each row execute function public.freeze_feed_item_group();

-- Cohérence du group_id dénormalisé : TOUJOURS recopié depuis le feed_item
-- parent, à l'INSERT comme à l'UPDATE (correctif DT-1). La FK composite le
-- garantit déjà ; ces triggers le remplissent automatiquement côté écriture.
create or replace function public.sync_group_id_from_feed_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  select group_id into new.group_id
  from public.feed_items
  where id = new.feed_item_id;
  if new.group_id is null then
    raise exception 'feed_item % introuvable', new.feed_item_id;
  end if;
  return new;
end;
$$;

create trigger sessions_sync_group_id
  before insert or update on public.sessions
  for each row execute function public.sync_group_id_from_feed_item();

create trigger step_logs_sync_group_id
  before insert or update on public.step_logs
  for each row execute function public.sync_group_id_from_feed_item();

create trigger meals_sync_group_id
  before insert or update on public.meals
  for each row execute function public.sync_group_id_from_feed_item();

create trigger reactions_sync_group_id
  before insert or update on public.reactions
  for each row execute function public.sync_group_id_from_feed_item();

-- Création automatique du profil à l'inscription (ADR-0005). L'onboarding
-- met ensuite à jour pseudo / avatar / is_adult.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, pseudo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'pseudo', ''), 'Nouveau membre')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
