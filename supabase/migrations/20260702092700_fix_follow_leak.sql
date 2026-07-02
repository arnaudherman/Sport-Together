-- =============================================================================
-- CORRECTIF DE FUITE (autocritique finale) : suivre quelqu'un (unilatéral, sans
-- consentement) ouvrait TOUS ses posts — y compris ceux de ses groupes PRIVÉS
-- (macros de repas comprises — contexte garde-fous TCA). Combiné à l'annuaire
-- search_profiles, n'importe quel authentifié pouvait lire les groupes privés
-- d'une cible en un follow. Violation de l'ADR-0004 (le tenant = le groupe).
--
-- Sémantique corrigée : le follow n'expose que la TIMELINE PERSO (posts solo,
-- group_id null) — les posts de groupe restent réservés aux membres. C'est déjà
-- la règle des photos (storage borne les followers à `solo/...`).
-- Au passage : list_public_groups gagne le rate limit qui lui manquait.
-- =============================================================================

drop policy feed_items_select on public.feed_items;
create policy feed_items_select on public.feed_items
  for select to authenticated
  using (
    public.is_group_member(group_id)
    or author_id = auth.uid()
    or (group_id is null and public.is_followed(author_id))
  );

create or replace function public.can_see_item(fid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.feed_items f
    where f.id = fid
      and (
        public.is_group_member(f.group_id)
        or f.author_id = auth.uid()
        or (f.group_id is null and public.is_followed(f.author_id))
      )
  );
$$;

-- profiles_select reste inchangé (voir le pseudo/bio d'un suivi est voulu) ;
-- détails / réactions / commentaires suivent can_see_item automatiquement.

create or replace function public.list_public_groups(q text default null)
returns table (id uuid, name text, member_count bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  perform public.check_rate_limit('search', 60, interval '1 hour');
  return query
    select g.id, g.name, count(m.user_id)::bigint as member_count
    from public.groups g
    left join public.memberships m on m.group_id = g.id
    where g.visibility = 'public'
      and (q is null or q = '' or g.name ilike '%' || q || '%')
    group by g.id, g.name
    order by member_count desc, g.name asc
    limit 20;
end;
$$;

-- Limites des buckets (autocritique : upload illimité de fichiers arbitraires).
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('feed-photos', 'avatars');

-- attach_photo : enfile l'ANCIEN chemin avant de l'écraser (sinon photo orpheline).
create or replace function public.attach_photo(p_feed_item_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  f public.feed_items;
  expected_prefix text;
  old_path text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;

  select * into f from public.feed_items where id = p_feed_item_id;
  if not found or f.author_id is distinct from auth.uid() then
    raise exception 'Publication introuvable ou non autorisée';
  end if;

  expected_prefix := coalesce(f.group_id::text, 'solo')
    || '/' || auth.uid()::text || '/' || p_feed_item_id::text || '/';
  if position(expected_prefix in p_path) <> 1 then
    raise exception 'Chemin de photo invalide';
  end if;

  if not exists (
    select 1 from storage.objects where bucket_id = 'feed-photos' and name = p_path
  ) then
    raise exception 'Photo introuvable dans le stockage';
  end if;

  if f.type = 'session' then
    select photo_path into old_path from public.sessions where feed_item_id = p_feed_item_id;
    update public.sessions set photo_path = p_path where feed_item_id = p_feed_item_id;
  elsif f.type = 'meal' then
    select photo_path into old_path from public.meals where feed_item_id = p_feed_item_id;
    update public.meals set photo_path = p_path where feed_item_id = p_feed_item_id;
  else
    raise exception 'Ce type de publication ne porte pas de photo';
  end if;

  if old_path is not null and old_path <> p_path then
    insert into public.photo_purge_queue (path) values (old_path)
    on conflict (path) do nothing;
  end if;
end;
$$;
