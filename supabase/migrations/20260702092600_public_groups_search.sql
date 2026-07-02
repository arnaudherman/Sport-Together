-- =============================================================================
-- GROUPES PUBLICS + RECHERCHE (social discovery) :
--   1. groups.visibility 'private' (défaut) | 'public' — au choix du créateur ;
--   2. list_public_groups(q) : annuaire des groupes publics (nom + nb membres),
--      accessible à tout authentifié — les groupes privés n'y apparaissent JAMAIS ;
--   3. join_public_group : rejoindre un groupe public SANS code (rate-limité,
--      même bucket que join_group_by_code) ;
--   4. create_group(nom, visibilité) : choix à la création (privé par défaut) ;
--   5. search_profiles(q) : annuaire de pseudos (id, pseudo, avatar) — champ
--      LIMITÉ, rate-limité, pour « chercher des gens » et les suivre.
-- =============================================================================

alter table public.groups
  add column visibility text not null default 'private'
  check (visibility in ('private', 'public'));

-- 2. Annuaire des groupes publics.
create or replace function public.list_public_groups(q text default null)
returns table (id uuid, name text, member_count bigint)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
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

revoke all on function public.list_public_groups(text) from public;
grant execute on function public.list_public_groups(text) to authenticated;

-- 3. Rejoindre un groupe PUBLIC sans code (même rate limit que le join par code).
create or replace function public.join_public_group(p_group_id uuid)
returns table (joined_id uuid, joined_name text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  perform public.check_rate_limit('join_group', 20, interval '12 hours');

  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  select * into g from public.groups where id = p_group_id and visibility = 'public';
  if not found then
    return; -- introuvable OU privé : réponse vide (pas d'oracle)
  end if;

  insert into public.memberships (group_id, user_id)
  values (g.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query select g.id, g.name;
end;
$$;

revoke all on function public.join_public_group(uuid) from public;
grant execute on function public.join_public_group(uuid) to authenticated;

-- 4. Visibilité au choix à la création (privé par défaut). REMPLACE create_group :
-- l'ancienne signature (text) doit être supprimée, sinon la nouvelle (text, text
-- default) la SURCHARGE et tout appel à un argument devient ambigu.
drop function if exists public.create_group(text);
create or replace function public.create_group(group_name text, p_visibility text default 'private')
returns public.groups
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if p_visibility not in ('private', 'public') then
    raise exception 'Visibilité invalide';
  end if;
  perform public.check_rate_limit('create_group', 10, interval '12 hours');

  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  for i in 1..5 loop
    begin
      insert into public.groups (name, created_by, invite_code, visibility)
      values (group_name, auth.uid(), public.gen_invite_code(), p_visibility)
      returning * into g;
      exit;
    exception when unique_violation then
      if i = 5 then
        raise exception 'Impossible de générer un code d''invitation unique';
      end if;
    end;
  end loop;

  insert into public.memberships (group_id, user_id)
  values (g.id, auth.uid());

  return g;
end;
$$;

-- 5. Chercher des gens : annuaire de pseudos, champs limités, rate-limité.
create or replace function public.search_profiles(q text)
returns table (id uuid, pseudo text, avatar_url text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  perform public.check_rate_limit('search', 60, interval '1 hour');
  if q is null or char_length(trim(q)) < 2 then
    return; -- au moins 2 caractères (pas de dump de l'annuaire)
  end if;
  return query
    select p.id, p.pseudo, p.avatar_url
    from public.profiles p
    where p.pseudo ilike '%' || trim(q) || '%'
      and p.id <> auth.uid()
    order by p.pseudo asc
    limit 20;
end;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;
