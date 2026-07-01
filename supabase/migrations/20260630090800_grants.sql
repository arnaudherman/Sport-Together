-- Droits de table pour les rôles Supabase.
--
-- La RLS (migrations 090100 + suivantes) est le gate au niveau LIGNE, mais elle ne
-- suffit pas : les rôles `authenticated` / `service_role` doivent aussi avoir les
-- droits DML au niveau TABLE, sinon PostgREST renvoie « permission denied for table ».
-- Sur un projet Supabase cloud ces droits sont généralement posés par les privilèges
-- par défaut ; en local (`supabase start`) et en self-host ils ne le sont pas — d'où
-- cette migration explicite (idempotente, sûre partout). Écriture directe malgré tout
-- bloquée où il faut par la RLS (adhésion réservée aux RPC, auteur non falsifiable).

-- Rôles Supabase : présents sur un vrai projet, créés ici s'ils manquent (portabilité
-- avec le harnais de test en Postgres nu).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- authenticated : DML gardé par la RLS au niveau ligne.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- service_role : accès complet (Edge Functions ; contourne la RLS par conception).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Tables/séquences futures : mêmes droits par défaut.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
