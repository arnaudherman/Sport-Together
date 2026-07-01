-- Modération UGC (App Store guideline 1.2) : SIGNALER du contenu + BLOQUER un
-- utilisateur. Requis avant toute ouverture publique (commentaires libres, bios,
-- visibilité inter-groupes des abonnements).

-- Signalements : écriture seule côté client (aucune politique SELECT — la
-- modération lit via service_role). On garde le signalement même si le
-- signaleur supprime son compte (modération) : pas de cascade, SET NULL.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_kind text not null check (target_kind in ('post', 'comment', 'profile')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 500),
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());
-- (pas de SELECT/UPDATE/DELETE : write-only pour l'authenticated)

create index reports_target_idx on public.reports (target_kind, target_id);

-- Blocages : sur le modèle de follows — chacun ne gère que SES blocages.
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy blocks_select on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create policy blocks_insert on public.blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy blocks_delete on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

-- Un blocage coupe aussi la relation de follow dans les deux sens (le bloqué ne
-- doit plus voir les posts solo du bloqueur via is_followed).
create or replace function public.blocks_sever_follows()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_sever_follows
  after insert on public.blocks
  for each row execute function public.blocks_sever_follows();
