-- Abonnements (solo-first, ADR-0010). Table `follows` : je suis des gens, leurs
-- posts remontent dans mon onglet « Abonnements ». RLS : chacun ne gère que ses
-- propres abonnements. Les GRANT sont posés par les privilèges par défaut (090800).
--
-- NOTE (backlog) : pour que les posts d'un abonnement HORS de mes groupes soient
-- visibles, la RLS de `feed_items` devra inclure « auteur suivi ». Aujourd'hui
-- l'accueil réel ne remonte que l'activité de mes groupes ; le follow inter-groupes
-- est une évolution backend (cf. docs/BACKLOG.md).

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

-- Lecture : mes abonnements + mes abonnés (savoir qui me suit).
create policy follows_select on public.follows for select
  using (follower_id = auth.uid() or followee_id = auth.uid());

-- Écriture : uniquement MES abonnements (follower = moi).
create policy follows_insert on public.follows for insert
  with check (follower_id = auth.uid());

create policy follows_delete on public.follows for delete
  using (follower_id = auth.uid());

create index follows_follower_idx on public.follows (follower_id);
create index follows_followee_idx on public.follows (followee_id);
