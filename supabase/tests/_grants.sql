-- Droits par défaut de Supabase sur les tables publiques (la RLS reste le gate).
-- À appliquer APRÈS les migrations. Test uniquement.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
