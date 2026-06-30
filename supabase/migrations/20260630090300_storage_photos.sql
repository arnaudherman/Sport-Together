-- =============================================================================
-- Sport Together — Stockage des photos (ADR-0004). Bucket privé.
-- Convention de chemin : feed-photos/<group_id>/<uid>/<feed_item_id>/<fichier>
--   segment 1 = group_id (isolation par groupe)
--   segment 2 = auth.uid() (propriété par auteur)
-- Lecture = tout membre du groupe ; écriture/suppression = l'auteur seulement.
-- Les lectures se font par URL signée. Durci après revue (ST-1, ST-2).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('feed-photos', 'feed-photos', false)
on conflict (id) do nothing;

-- Extrait le group_id (1er segment) du chemin, fail-closed : un segment non-UUID
-- renvoie NULL (=> is_group_member(NULL) = false) au lieu de lever une exception
-- qui avorterait toute la requête de listing (correctif ST-1).
create or replace function public.storage_group_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

-- Lecture : tout membre du groupe voit les photos du groupe.
create policy "feed-photos lecture membres" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feed-photos'
    and public.is_group_member(public.storage_group_id(name))
  );

-- Écriture : membre du groupe ET le 2e segment du chemin est son propre uid.
create policy "feed-photos écriture auteur" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feed-photos'
    and public.is_group_member(public.storage_group_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Mise à jour (upsert) : réservée à l'auteur.
create policy "feed-photos maj auteur" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'feed-photos'
    and public.is_group_member(public.storage_group_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'feed-photos'
    and public.is_group_member(public.storage_group_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Suppression : réservée à l'auteur.
create policy "feed-photos suppression auteur" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feed-photos'
    and public.is_group_member(public.storage_group_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );
