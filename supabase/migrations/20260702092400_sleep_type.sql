-- Sommeil (qualité de vie) : nouveau type de feed `sleep` + table de détail
-- `sleep_logs` (heures). Même patron que step_logs : FK composite + FK simple
-- (posts solo), trigger de sync du group_id, RLS lecture via can_see_item,
-- écriture null-safe. Type additif (ADR-0002).

alter type public.feed_item_type add value if not exists 'sleep';

create table public.sleep_logs (
  feed_item_id uuid primary key,
  group_id     uuid,
  hours        numeric(4,1) not null check (hours > 0 and hours <= 24),
  created_at   timestamptz not null default now(),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade,
  constraint sleep_logs_feed_item_fk
    foreign key (feed_item_id) references public.feed_items (id) on delete cascade
);

create trigger sleep_logs_sync_group_id
  before insert on public.sleep_logs
  for each row execute function public.sync_group_id_from_feed_item();

alter table public.sleep_logs enable row level security;

create policy sleep_logs_select on public.sleep_logs
  for select to authenticated
  using (public.can_see_item(feed_item_id));

create policy sleep_logs_write on public.sleep_logs
  for insert to authenticated
  with check (
    (group_id is null or public.is_group_member(group_id))
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid()
        and f.group_id is not distinct from group_id
    )
  );

create policy sleep_logs_delete on public.sleep_logs
  for delete to authenticated
  using (exists (select 1 from public.feed_items f
                 where f.id = feed_item_id and f.author_id = auth.uid()));

-- RPC : p_group_id null = nuit « solo » (timeline perso). Même rate limit que log_*.
create or replace function public.log_sleep(
  p_group_id uuid,
  p_hours numeric
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
  if p_hours is null or p_hours <= 0 or p_hours > 24 then
    raise exception 'Durée de sommeil invalide';
  end if;

  insert into public.feed_items (group_id, author_id, type)
  values (p_group_id, auth.uid(), 'sleep')
  returning id into fid;

  insert into public.sleep_logs (feed_item_id, hours)
  values (fid, p_hours);

  return fid;
end;
$$;

grant execute on function public.log_sleep(uuid, numeric) to authenticated;
