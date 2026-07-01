-- Jour de repos (vision §8 — streak NON PUNITIF). Nouveau type de feed `rest` :
-- poser un repos publie une entrée (visible comme le reste du fil, la récup fait
-- partie de la progression) et « satisfait » la journée pour le streak côté client
-- (borné à 2 repos / 7 jours glissants dans le domaine — non farmable).
-- Type additif (ADR-0002 : le feed polymorphe absorbe les nouveaux types sans
-- migration de structure) ; pas de table de détail pour `rest`.

alter type public.feed_item_type add value if not exists 'rest';

-- RPC calquée sur log_steps : p_group_id null = repos « solo » (timeline perso).
-- NB : la valeur d'enum est utilisée à l'EXÉCUTION seulement (littéral dans le
-- corps plpgsql), pas à la création de la fonction — compatible avec un runner
-- de migrations transactionnel.
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
  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'Non membre du groupe';
  end if;
  -- Un seul repos par jour (UTC) et par destination : poser deux fois = no-op.
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

grant execute on function public.log_rest(uuid) to authenticated;
