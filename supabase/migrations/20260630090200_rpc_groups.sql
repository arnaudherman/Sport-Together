-- =============================================================================
-- Sport Together — RPC d'adhésion (ADR-0004). Création de groupe et adhésion
-- par code passent par des fonctions SECURITY DEFINER : ce sont les SEULS
-- chemins d'écriture sur public.memberships (aucune politique d'INSERT directe).
-- Durci après revue : upsert profil idempotent, retry sur collision de code,
-- fetch mono-ligne robuste, search_path figé, et join ne fuit PAS le code.
-- =============================================================================

-- Crée un groupe, génère son code d'invitation (avec retry sur collision) et
-- ajoute le créateur comme membre, le tout atomiquement. Renvoie le groupe
-- complet (le créateur a besoin du invite_code pour le partager).
create or replace function public.create_group(group_name text)
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

  -- Robustesse : garantit l'existence du profil (FK created_by / user_id).
  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  for i in 1..5 loop
    begin
      insert into public.groups (name, created_by, invite_code)
      values (group_name, auth.uid(), public.gen_invite_code())
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

-- Rejoint un groupe via son code d'invitation. Valide le code côté serveur ;
-- l'utilisateur ne peut jamais choisir un group_id arbitraire. Ne renvoie QUE
-- (id, name) : le invite_code n'est jamais exposé à celui qui rejoint.
-- Colonnes de sortie nommées joined_* : ne PAS les appeler id/name, sinon elles
-- entrent en collision (paramètres OUT) avec le `on conflict (id)` du upsert profil
-- ci-dessous -> « column reference id is ambiguous » (bug détecté par les tests réels).
create or replace function public.join_group_by_code(code text)
returns table (joined_id uuid, joined_name text)
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

  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  select * into g
  from public.groups
  where invite_code = upper(trim(code))
  limit 1;

  if not found then
    raise exception 'Code d''invitation invalide';
  end if;

  insert into public.memberships (group_id, user_id)
  values (g.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query select g.id, g.name;
end;
$$;

-- Accès aux RPC pour les utilisateurs authentifiés uniquement.
revoke all on function public.create_group(text)       from public;
revoke all on function public.join_group_by_code(text)  from public;
grant execute on function public.create_group(text)      to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
