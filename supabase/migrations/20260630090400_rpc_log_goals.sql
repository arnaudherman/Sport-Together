-- =============================================================================
-- Sport Together — RPC de log atomique (correctif revue : log non atomique).
-- Chaque log insère l'entrée de feed ET son détail dans la MÊME transaction.
-- SECURITY DEFINER => contourne la RLS : on RE-VÉRIFIE donc l'appartenance au
-- groupe explicitement (sinon on pourrait écrire dans un groupe non-membre).
-- =============================================================================

create or replace function public.log_session(
  p_group_id uuid,
  p_activity text,
  p_duration_min integer default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'session')
  returning id into fid;

  insert into public.sessions (feed_item_id, activity, duration_min)
  values (fid, p_activity, p_duration_min);

  return fid;
end;
$$;

create or replace function public.log_steps(
  p_group_id uuid,
  p_steps integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'steps')
  returning id into fid;

  insert into public.step_logs (feed_item_id, steps)
  values (fid, p_steps);

  return fid;
end;
$$;

create or replace function public.log_meal(
  p_group_id uuid,
  p_label text,
  p_moment text default null,
  p_calories_kcal integer default null,
  p_protein_g numeric default null,
  p_carbs_g numeric default null,
  p_fat_g numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'meal')
  returning id into fid;

  insert into public.meals (feed_item_id, label, moment, calories_kcal, protein_g, carbs_g, fat_g)
  values (fid, p_label, p_moment, p_calories_kcal, p_protein_g, p_carbs_g, p_fat_g);

  return fid;
end;
$$;

revoke all on function public.log_session(uuid, text, integer)                       from public;
revoke all on function public.log_steps(uuid, integer)                               from public;
revoke all on function public.log_meal(uuid, text, text, integer, numeric, numeric, numeric) from public;
grant execute on function public.log_session(uuid, text, integer)                       to authenticated;
grant execute on function public.log_steps(uuid, integer)                               to authenticated;
grant execute on function public.log_meal(uuid, text, text, integer, numeric, numeric, numeric) to authenticated;
