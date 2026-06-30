-- =============================================================================
-- Sport Together — Durcissement du code d'invitation (suite revue sécurité).
-- Ajoute une expiration optionnelle + une RPC de rotation réservée au créateur.
-- (L'entropie 80 bits et le non-retour du code par join sont déjà en place.)
-- =============================================================================

alter table public.groups add column invite_code_expires_at timestamptz;

-- join refuse désormais un code expiré.
create or replace function public.join_group_by_code(code text)
returns table (joined_id uuid, joined_name text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;

  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  select * into g
  from public.groups
  where invite_code = upper(trim(code))
  limit 1;

  if not found then raise exception 'Code d''invitation invalide'; end if;
  if g.invite_code_expires_at is not null and g.invite_code_expires_at < now() then
    raise exception 'Code d''invitation expiré';
  end if;

  insert into public.memberships (group_id, user_id)
  values (g.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query select g.id, g.name;
end;
$$;

-- Rotation du code (révocation) — réservée au créateur du groupe. p_expires_at
-- optionnel (NULL = pas d'expiration).
create or replace function public.rotate_invite_code(p_group_id uuid, p_expires_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not exists (
    select 1 from public.groups where id = p_group_id and created_by = auth.uid()
  ) then
    raise exception 'Réservé au créateur du groupe';
  end if;

  for i in 1..5 loop
    begin
      new_code := public.gen_invite_code();
      update public.groups
      set invite_code = new_code, invite_code_expires_at = p_expires_at
      where id = p_group_id;
      exit;
    exception when unique_violation then
      if i = 5 then raise exception 'Impossible de générer un code unique'; end if;
    end;
  end loop;

  return new_code;
end;
$$;

revoke all on function public.rotate_invite_code(uuid, timestamptz) from public;
grant execute on function public.rotate_invite_code(uuid, timestamptz) to authenticated;
