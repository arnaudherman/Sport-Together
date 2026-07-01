-- Commentaires sur les posts (Twitter-like, ADR-0010). Calqué sur `reactions` :
-- group_id dénormalisé (FK composite + trigger) pour une RLS par groupe efficace.
-- Les GRANT sont posés par les privilèges par défaut (090800).

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  feed_item_id uuid not null,
  group_id     uuid not null,
  author_id    uuid references public.profiles (id) on delete set null,
  text         text not null check (char_length(text) between 1 and 2000),
  created_at   timestamptz not null default now(),
  foreign key (feed_item_id, group_id)
    references public.feed_items (id, group_id) on delete cascade
);

create index comments_feed_item_idx on public.comments (feed_item_id, created_at);
create index comments_group_idx on public.comments (group_id);

-- group_id recopié depuis le feed_item parent (comme reactions).
create trigger comments_sync_group_id
  before insert or update on public.comments
  for each row execute function public.sync_group_id_from_feed_item();

alter table public.comments enable row level security;

create policy comments_select on public.comments
  for select to authenticated
  using (public.is_group_member(group_id));

create policy comments_insert on public.comments
  for insert to authenticated
  with check (public.is_group_member(group_id) and author_id = auth.uid());

create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid());
