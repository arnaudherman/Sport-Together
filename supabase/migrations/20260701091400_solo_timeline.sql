-- =============================================================================
-- TIMELINE PERSO (solo-first, ADR-0010) : publier SANS groupe.
-- `feed_items.group_id` devient NULLABLE ; un post solo (group_id null) est
-- visible par son AUTEUR et ses ABONNÉS (la politique feed_items_select couvre
-- déjà ces deux cas — is_group_member(null) est faux), jamais par un tiers.
-- Le front est prêt (composer « Mon fil ») ; côté client il suffit de passer
-- p_group_id = null aux RPC log_*.
--
-- Impacts couverts ici :
--   1. NOT NULL levé sur feed_items.group_id + tables enfants (le trigger de
--      sync y recopie null) ;
--   2. FK simple (feed_item_id) ajoutée aux 5 tables enfants : la FK composite
--      est MATCH SIMPLE, donc non appliquée quand group_id est null — la FK
--      simple garantit l'intégrité + le cascade des lignes solo ;
--   3. triggers réécrits null-safe : sync (sentinelle `found` au lieu de
--      `group_id is null`), freeze (`is distinct from`), notify (pas de groupe
--      à notifier -> skip) ;
--   4. RLS d'écriture null-safe (feed_items, détails) ;
--   5. réactions/commentaires : autorisés partout où l'on VOIT le post
--      (can_see_item) — couvre groupes, posts solo et auteurs suivis ;
--   6. RPC log_* : p_group_id null = post solo (le check membre ne s'applique
--      qu'avec un groupe).
-- =============================================================================

-- 1. group_id nullable ------------------------------------------------------
alter table public.feed_items alter column group_id drop not null;
alter table public.sessions   alter column group_id drop not null;
alter table public.step_logs  alter column group_id drop not null;
alter table public.meals      alter column group_id drop not null;
alter table public.reactions  alter column group_id drop not null;
alter table public.comments   alter column group_id drop not null;

-- 2. FK simple d'intégrité pour les lignes solo (composite non appliquée si null)
alter table public.sessions  add constraint sessions_feed_item_fk
  foreign key (feed_item_id) references public.feed_items (id) on delete cascade;
alter table public.step_logs add constraint step_logs_feed_item_fk
  foreign key (feed_item_id) references public.feed_items (id) on delete cascade;
alter table public.meals     add constraint meals_feed_item_fk
  foreign key (feed_item_id) references public.feed_items (id) on delete cascade;
alter table public.reactions add constraint reactions_feed_item_fk
  foreign key (feed_item_id) references public.feed_items (id) on delete cascade;
alter table public.comments  add constraint comments_feed_item_fk
  foreign key (feed_item_id) references public.feed_items (id) on delete cascade;

-- 3a. Sync : la sentinelle « group_id is null = introuvable » ne tient plus.
create or replace function public.sync_group_id_from_feed_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  select group_id into new.group_id
  from public.feed_items
  where id = new.feed_item_id;
  if not found then
    raise exception 'feed_item % introuvable', new.feed_item_id;
  end if;
  return new;
end;
$$;

-- 3b. Freeze : null-safe (un post solo ne peut pas être déplacé dans un groupe).
create or replace function public.freeze_feed_item_group()
returns trigger language plpgsql as $$
begin
  if new.group_id is distinct from old.group_id then
    raise exception 'group_id d''un feed_item est immuable';
  end if;
  return new;
end;
$$;

-- 3c. Notify : un post solo n'a pas de groupe à notifier.
create or replace function public.notify_group_on_feed_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  edge_url text := current_setting('app.edge_notify_url', true);
  edge_key text := current_setting('app.edge_service_key', true);
begin
  if new.group_id is null then
    return new; -- post solo : pas de destinataires de groupe
  end if;
  if edge_url is null or edge_url = '' then
    return new;
  end if;

  perform net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(edge_key, '')
    ),
    body := jsonb_build_object(
      'feed_item_id', new.id,
      'group_id', new.group_id,
      'author_id', new.author_id,
      'type', new.type
    )
  );
  return new;
end;
$$;

-- 4. RLS d'écriture null-safe ------------------------------------------------
drop policy feed_items_insert on public.feed_items;
create policy feed_items_insert on public.feed_items
  for insert to authenticated
  with check (
    (group_id is null or public.is_group_member(group_id))
    and author_id = auth.uid()
  );

drop policy feed_items_update on public.feed_items;
create policy feed_items_update on public.feed_items
  for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );

-- Détails : mêmes garanties (défense en profondeur), comparaisons null-safe.
drop policy sessions_write on public.sessions;
create policy sessions_write on public.sessions
  for insert to authenticated
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

drop policy sessions_modify on public.sessions;
create policy sessions_modify on public.sessions
  for update to authenticated
  using (
    exists (select 1 from public.feed_items f
            where f.id = feed_item_id and f.author_id = auth.uid()
              and f.group_id is not distinct from group_id)
  )
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

drop policy step_logs_write on public.step_logs;
create policy step_logs_write on public.step_logs
  for insert to authenticated
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

drop policy meals_write on public.meals;
create policy meals_write on public.meals
  for insert to authenticated
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

drop policy meals_modify on public.meals;
create policy meals_modify on public.meals
  for update to authenticated
  using (
    exists (select 1 from public.feed_items f
            where f.id = feed_item_id and f.author_id = auth.uid()
              and f.group_id is not distinct from group_id)
  )
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

-- 5. Réagir / commenter partout où l'on VOIT le post (groupes, solo, suivis).
drop policy reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (public.can_see_item(feed_item_id) and author_id = auth.uid());

drop policy comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (public.can_see_item(feed_item_id) and author_id = auth.uid());

-- 6. RPC : p_group_id null = post solo ---------------------------------------
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
  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;
  -- Age-gating serveur (ADR-0008) : la nutrition est réservée aux adultes.
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
