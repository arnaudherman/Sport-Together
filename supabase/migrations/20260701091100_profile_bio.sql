-- Bio libre sur le profil (ADR-0005). Lisible via la RLS profils existante (visible
-- des co-membres) et modifiable seulement par soi (politique profiles_update = auteur).
alter table public.profiles add column if not exists bio text;
