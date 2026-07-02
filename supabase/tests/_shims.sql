-- =============================================================================
-- Shims de TEST uniquement. Reproduisent le strict nécessaire des schémas auth /
-- storage de Supabase pour exécuter les migrations + tester la RLS sur un
-- PostgreSQL nu. NE JAMAIS appliquer en production.
-- =============================================================================
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- --- schéma auth ---
create schema if not exists auth;
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
-- auth.uid() lit la claim JWT 'sub' (posée par le client réel ; par set_config en test).
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- --- schéma storage ---
create schema if not exists storage;
create table if not exists storage.buckets (
  id     text primary key,
  name   text,
  public boolean,
  -- colonnes du vrai storage.buckets utilisées par nos migrations (limites d'upload)
  file_size_limit    bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid
);
alter table storage.objects enable row level security;
-- foldername : segments du chemin SANS le nom de fichier final (comme Supabase).
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;

-- --- droits d'usage des schémas (comme Supabase) ---
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to anon, authenticated;
