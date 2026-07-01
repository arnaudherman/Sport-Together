-- Anti-abus des RPC (revue sécurité) : plafonds de fréquence ATOMIQUES sur les
-- chemins d'écriture. Sans eux : création de groupes en boucle, martèlement de
-- join_group_by_code (brute-force du code), flood du feed (chaque log_* déclenche
-- un push à tout le groupe). Même principe de bucket que le throttle des nudges.
-- Messages positifs (vision §8) — jamais punitifs.

-- Compteur d'appels par (utilisateur, action, fenêtre). Aucune politique RLS :
-- invisible et inaccessible à `authenticated` ; seules les RPC SECURITY DEFINER
-- y écrivent.
create table public.rpc_attempts (
  user_id uuid not null,
  action  text not null,
  bucket  timestamptz not null,
  count   integer not null default 1,
  primary key (user_id, action, bucket)
);
alter table public.rpc_attempts enable row level security;

-- Incrémente le compteur de la fenêtre courante et lève si le plafond est dépassé.
-- UPSERT atomique : fiable sous appels concurrents (pas de TOCTOU).
create or replace function public.check_rate_limit(
  p_action text,
  p_cap integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  win_s numeric := extract(epoch from p_window);
  b timestamptz := to_timestamp(floor(extract(epoch from now()) / win_s) * win_s);
  n integer;
begin
  insert into public.rpc_attempts (user_id, action, bucket, count)
  values (auth.uid(), p_action, b, 1)
  on conflict (user_id, action, bucket)
    do update set count = public.rpc_attempts.count + 1
  returning count into n;
  if n > p_cap then
    raise exception 'Doucement — réessaie un peu plus tard 🙂';
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, interval) from public;

-- create_group : au plus 10 créations / 12 h.
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
  perform public.check_rate_limit('create_group', 10, interval '12 hours');

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

-- join_group_by_code : au plus 20 TENTATIVES / 12 h. Point clé : un code invalide
-- ou expiré renvoie un résultat VIDE au lieu de lever une exception — une exception
-- ferait ROLLBACK du compteur (la tentative ratée ne compterait jamais, le
-- brute-force resterait gratuit). Bonus sécurité : message unique côté client,
-- plus d'oracle « invalide vs expiré ».
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
  perform public.check_rate_limit('join_group', 20, interval '12 hours');

  insert into public.profiles (id, pseudo)
  values (auth.uid(), 'Nouveau membre')
  on conflict (id) do nothing;

  select * into g
  from public.groups
  where invite_code = upper(trim(code))
  limit 1;

  -- Invalide OU expiré : réponse vide (la transaction commite -> tentative comptée).
  if not found
     or (g.invite_code_expires_at is not null and g.invite_code_expires_at < now()) then
    return;
  end if;

  insert into public.memberships (group_id, user_id)
  values (g.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return query select g.id, g.name;
end;
$$;

-- log_* : au plus 30 publications / heure, tous types confondus (anti-flood du
-- feed ET des notifications de groupe qui partent à chaque insert).
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
  perform public.check_rate_limit('log', 30, interval '1 hour');
  if p_group_id is not null and not public.is_group_member(p_group_id) then
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
  perform public.check_rate_limit('log', 30, interval '1 hour');
  if p_group_id is not null and not public.is_group_member(p_group_id) then
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
  perform public.check_rate_limit('log', 30, interval '1 hour');
  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;
  if not coalesce((select is_adult from public.profiles where id = auth.uid()), false) then
    raise exception 'Le suivi nutritionnel est réservé aux adultes';
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'meal')
  returning id into fid;

  insert into public.meals (feed_item_id, label, moment, calories_kcal, protein_g, carbs_g, fat_g)
  values (fid, p_label, p_moment, p_calories_kcal, p_protein_g, p_carbs_g, p_fat_g);

  return fid;
end;
$$;

create or replace function public.log_rest(
  p_group_id uuid default null
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
  perform public.check_rate_limit('log', 30, interval '1 hour');
  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;
  select id into fid
  from public.feed_items
  where author_id = auth.uid()
    and type = 'rest'
    and group_id is not distinct from p_group_id
    and created_at >= date_trunc('day', now());
  if fid is not null then
    return fid;
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'rest')
  returning id into fid;

  return fid;
end;
$$;
