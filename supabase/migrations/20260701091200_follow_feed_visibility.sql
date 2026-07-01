-- Visibilité du fil « Abonnements » (solo-first, ADR-0010). Aujourd'hui la RLS ne
-- montre que les posts de MES groupes ; suivre quelqu'un hors groupe commun n'a
-- aucun effet. On élargit les politiques SELECT pour rendre visibles les posts (et
-- leurs détails, réactions, commentaires, et le profil auteur) des utilisateurs
-- que JE suis. L'isolation tient : un non-membre non-abonné ne voit toujours rien.

-- Helpers SECURITY DEFINER (lisent follows/feed_items sans dépendre de la RLS).
create or replace function public.is_followed(target uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and followee_id = target
  );
$$;

-- Puis-je voir ce feed_item ? (membre du groupe, ou auteur, ou auteur suivi)
create or replace function public.can_see_item(fid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.feed_items f
    where f.id = fid
      and (
        public.is_group_member(f.group_id)
        or f.author_id = auth.uid()
        or public.is_followed(f.author_id)
      )
  );
$$;

-- feed_items : + auteur + auteurs suivis.
drop policy feed_items_select on public.feed_items;
create policy feed_items_select on public.feed_items
  for select to authenticated
  using (
    public.is_group_member(group_id)
    or author_id = auth.uid()
    or public.is_followed(author_id)
  );

-- Détails / réactions / commentaires : visibles si le feed_item l'est.
drop policy sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select to authenticated
  using (public.can_see_item(feed_item_id));

drop policy step_logs_select on public.step_logs;
create policy step_logs_select on public.step_logs
  for select to authenticated
  using (public.can_see_item(feed_item_id));

drop policy meals_select on public.meals;
create policy meals_select on public.meals
  for select to authenticated
  using (public.can_see_item(feed_item_id));

drop policy reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select to authenticated
  using (public.can_see_item(feed_item_id));

drop policy comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated
  using (public.can_see_item(feed_item_id));

-- profiles : + profils des gens que je suis (pour afficher nom/bio dans le fil).
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_group_with(id)
    or public.is_followed(id)
  );
