-- =============================================================================
-- Sport Together — Correctifs issus de l'analyse de code (high).
--   (1) sync_group_id : LÈVE sur incohérence au lieu de la masquer.
--   (2) table nudges : support du rate-limiting anti-harcèlement (Edge `nudge`).
-- =============================================================================

-- (1) Le trigger ne remplit le group_id que s'il est NULL ; s'il est fourni et
-- diffère du feed_item parent, on REJETTE (au lieu d'aligner silencieusement,
-- ce qui masquait les incohérences et désynchronisait la validation RLS).
create or replace function public.sync_group_id_from_feed_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  parent_group uuid;
begin
  select group_id into parent_group from public.feed_items where id = new.feed_item_id;
  if parent_group is null then
    raise exception 'feed_item % introuvable', new.feed_item_id;
  end if;
  if new.group_id is null then
    new.group_id := parent_group;
  elsif new.group_id <> parent_group then
    raise exception 'group_id incohérent avec le feed_item parent';
  end if;
  return new;
end;
$$;

-- (2) Journal des relances pour le throttle (1 par couple émetteur/cible / fenêtre).
-- Aucune politique RLS : table interne, accédée uniquement par le service_role
-- (Edge Function `nudge`). RLS activée => l'authenticated n'y touche pas.
create table public.nudges (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index nudges_throttle_idx on public.nudges (sender_id, target_id, created_at desc);
alter table public.nudges enable row level security;
