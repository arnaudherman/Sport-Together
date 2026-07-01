-- Gestion de groupe : le code d'invitation redevient consultable APRÈS la création
-- (aujourd'hui il n'est visible qu'une fois, la boucle d'invitation casse là).
-- RPC SECURITY DEFINER réservée aux MEMBRES du groupe ; le code reste invisible
-- pour un non-membre (pas de SELECT direct sur groups.invite_code côté client).

create or replace function public.get_group_invite(p_group_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;
  return query
    select g.invite_code, g.invite_code_expires_at
    from public.groups g
    where g.id = p_group_id;
end;
$$;

revoke all on function public.get_group_invite(uuid) from public;
grant execute on function public.get_group_invite(uuid) to authenticated;
