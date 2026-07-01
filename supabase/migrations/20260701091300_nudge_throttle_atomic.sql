-- Durcissement du throttle anti-harcèlement des relances (Edge `nudge`).
-- Avant : le throttle « 1 par couple (émetteur, cible) / 12h » était vérifié par un
-- SELECT count puis un INSERT séparés (TOCTOU : deux appels concurrents passaient tous
-- deux le check). On rend la garantie ATOMIQUE via un index UNIQUE sur un « bucket » de
-- 12h : l'INSERT ... ON CONFLICT DO NOTHING échoue silencieusement si le couple a déjà
-- relancé dans la fenêtre. Le bucket est fourni explicitement par la fonction (colonne
-- simple, pas de génération non-immutable sur timestamptz).

alter table public.nudges add column if not exists bucket timestamptz;

-- Backfill des lignes existantes : début de la fenêtre de 12h contenant created_at.
update public.nudges
set bucket = to_timestamp(floor(extract(epoch from created_at) / 43200) * 43200)
where bucket is null;

alter table public.nudges alter column bucket set not null;

-- Unicité (émetteur, cible, fenêtre) : socle atomique du throttle par couple.
drop index if exists public.nudges_throttle_idx;
create unique index if not exists nudges_throttle_uq
  on public.nudges (sender_id, target_id, bucket);

-- Lecture rapide du plafond GLOBAL par cible (N émetteurs distincts / fenêtre).
create index if not exists nudges_target_bucket_idx
  on public.nudges (target_id, bucket);
