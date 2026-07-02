-- =============================================================================
-- PHOTOS bout-en-bout (vision §7 « photo-preuve », DA v2 « la photo fait partie
-- du langage ») :
--   1. chemins SOLO autorisés dans feed-photos (`solo/<uid>/<feed_item_id>/...`),
--      lisibles par l'auteur et ses abonnés (mêmes règles que le post solo) ;
--   2. RPC attach_photo : rattache une photo UPLOADÉE à SON post, avec chemin
--      strictement vérifié (anti-forgerie) et objet existant ;
--   3. purge : la suppression d'un détail avec photo met le chemin en file
--      d'attente (photo_purge_queue) — plus de photos orphelines ;
--   4. bucket public `avatars` (photo de profil), écriture sous son propre uid.
-- =============================================================================

-- Uid du 2e segment d'un chemin, fail-closed (non-UUID -> NULL).
create or replace function public.storage_path_uid(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[2] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(object_name))[2])::uuid
    else null
  end;
$$;

-- 1. Policies feed-photos : + chemins solo. (Recréées — mêmes garanties groupe.)
drop policy "feed-photos lecture membres" on storage.objects;
create policy "feed-photos lecture membres" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feed-photos'
    and (
      public.is_group_member(public.storage_group_id(name))
      or (
        (storage.foldername(name))[1] = 'solo'
        and (
          public.storage_path_uid(name) = auth.uid()
          or public.is_followed(public.storage_path_uid(name))
        )
      )
    )
  );

drop policy "feed-photos écriture auteur" on storage.objects;
create policy "feed-photos écriture auteur" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      public.is_group_member(public.storage_group_id(name))
      or (storage.foldername(name))[1] = 'solo'
    )
  );

drop policy "feed-photos maj auteur" on storage.objects;
create policy "feed-photos maj auteur" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      public.is_group_member(public.storage_group_id(name))
      or (storage.foldername(name))[1] = 'solo'
    )
  )
  with check (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      public.is_group_member(public.storage_group_id(name))
      or (storage.foldername(name))[1] = 'solo'
    )
  );

drop policy "feed-photos suppression auteur" on storage.objects;
create policy "feed-photos suppression auteur" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      public.is_group_member(public.storage_group_id(name))
      or (storage.foldername(name))[1] = 'solo'
    )
  );

-- 2. attach_photo : rattache une photo à SON post, chemin strictement contrôlé.
create or replace function public.attach_photo(p_feed_item_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.feed_items;
  expected_prefix text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;

  select * into f from public.feed_items where id = p_feed_item_id;
  if not found or f.author_id is distinct from auth.uid() then
    raise exception 'Publication introuvable ou non autorisée';
  end if;

  -- Chemin imposé : <group_id|solo>/<uid>/<feed_item_id>/...
  expected_prefix := coalesce(f.group_id::text, 'solo')
    || '/' || auth.uid()::text || '/' || p_feed_item_id::text || '/';
  if position(expected_prefix in p_path) <> 1 then
    raise exception 'Chemin de photo invalide';
  end if;

  -- L'objet doit exister (uploadé au préalable sous les policies storage).
  if not exists (
    select 1 from storage.objects where bucket_id = 'feed-photos' and name = p_path
  ) then
    raise exception 'Photo introuvable dans le stockage';
  end if;

  if f.type = 'session' then
    update public.sessions set photo_path = p_path where feed_item_id = p_feed_item_id;
  elsif f.type = 'meal' then
    update public.meals set photo_path = p_path where feed_item_id = p_feed_item_id;
  else
    raise exception 'Ce type de publication ne porte pas de photo';
  end if;
end;
$$;

revoke all on function public.attach_photo(uuid, text) from public;
grant execute on function public.attach_photo(uuid, text) to authenticated;

-- 3. Purge des photos à la suppression du détail (cascade comprise).
create table public.photo_purge_queue (
  path        text primary key,
  enqueued_at timestamptz not null default now()
);
alter table public.photo_purge_queue enable row level security; -- aucun accès authenticated

create or replace function public.enqueue_photo_purge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.photo_path is not null then
    insert into public.photo_purge_queue (path) values (old.photo_path)
    on conflict (path) do nothing;
  end if;
  return old;
end;
$$;

create trigger sessions_photo_purge
  after delete on public.sessions
  for each row execute function public.enqueue_photo_purge();

create trigger meals_photo_purge
  after delete on public.meals
  for each row execute function public.enqueue_photo_purge();

-- 4. Avatars : bucket PUBLIC (lecture par URL publique), écriture sous SON uid.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars écriture soi" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars maj soi" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars suppression soi" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
