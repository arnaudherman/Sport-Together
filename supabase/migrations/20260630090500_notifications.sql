-- =============================================================================
-- Sport Together — Notifications push (ADR-0006). Stockage des tokens d'appareil
-- + trigger qui déclenche l'Edge Function `notify_group` à chaque nouvelle entrée
-- de feed. Le déclenchement réel passe par pg_net (net.http_post) ; le trigger est
-- GARDÉ : sans URL configurée il ne fait rien (sûr en test / hors prod).
-- =============================================================================

-- Tokens Expo Push, un par appareil. L'utilisateur ne gère que les siens.
create table public.device_tokens (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token      text not null,
  platform   text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy device_tokens_select on public.device_tokens
  for select to authenticated using (user_id = auth.uid());
create policy device_tokens_insert on public.device_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy device_tokens_update on public.device_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy device_tokens_delete on public.device_tokens
  for delete to authenticated using (user_id = auth.uid());

-- Déclenchement de l'Edge Function à l'insertion d'une entrée de feed. La
-- sélection des destinataires (membres du groupe sauf l'auteur) + l'envoi Expo
-- se font côté Edge Function (service_role), pas ici (ADR-0006).
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
  -- Garde : sans configuration, on ne fait rien (sûr en dev/test).
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

create trigger feed_items_notify
  after insert on public.feed_items
  for each row execute function public.notify_group_on_feed_item();
