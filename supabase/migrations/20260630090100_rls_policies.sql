-- =============================================================================
-- Sport Together — Row Level Security (ADR-0004). Isolation par groupe.
-- Principe : RLS activée sur TOUTE table de groupe ; l'autorisation passe par
-- public.is_group_member(group_id). Aucune table de groupe sans politique.
-- (Le rôle service_role contourne la RLS pour les Edge Functions — ADR-0006.)
-- Durci après revue de sécurité : tout WITH CHECK d'écriture exige l'appartenance.
-- =============================================================================

alter table public.profiles    enable row level security;
alter table public.groups      enable row level security;
alter table public.memberships enable row level security;
alter table public.feed_items  enable row level security;
alter table public.sessions    enable row level security;
alter table public.step_logs   enable row level security;
alter table public.meals       enable row level security;
alter table public.reactions   enable row level security;

-- -----------------------------------------------------------------------------
-- profiles : soi-même + les profils des co-membres (pour afficher le feed).
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Pas de DELETE direct : la suppression de compte passe par auth (cascade).

-- -----------------------------------------------------------------------------
-- groups : visibles par les membres ; modifiables/supprimables par le créateur.
-- Création UNIQUEMENT via la RPC create_group (pas d'INSERT direct).
-- -----------------------------------------------------------------------------
create policy groups_select on public.groups
  for select to authenticated
  using (public.is_group_member(id));

create policy groups_update on public.groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy groups_delete on public.groups
  for delete to authenticated
  using (created_by = auth.uid());

-- -----------------------------------------------------------------------------
-- memberships : visibles par les membres ; on peut quitter (DELETE de sa ligne).
-- Aucune politique d'INSERT : l'adhésion passe par les RPC create_group /
-- join_group_by_code (SECURITY DEFINER), seuls chemins validant le code — sinon
-- on pourrait s'auto-injecter dans n'importe quel group_id.
-- -----------------------------------------------------------------------------
create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_group_member(group_id));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- feed_items : lecture/écriture par les membres ; l'auteur est forcément soi.
-- UPDATE : on ne modifie que ses lignes (USING) ET la cible doit rester un
-- groupe dont on est membre (WITH CHECK) — group_id est par ailleurs immuable
-- (trigger feed_items_freeze_group). Correctif FI-1.
-- -----------------------------------------------------------------------------
create policy feed_items_select on public.feed_items
  for select to authenticated
  using (public.is_group_member(group_id));

create policy feed_items_insert on public.feed_items
  for insert to authenticated
  with check (public.is_group_member(group_id) and author_id = auth.uid());

create policy feed_items_update on public.feed_items
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.is_group_member(group_id));

create policy feed_items_delete on public.feed_items
  for delete to authenticated
  using (author_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Tables de détail (sessions / step_logs / meals). Défense en profondeur
-- (correctif DT-1) : tout WITH CHECK exige l'appartenance au groupe ET que le
-- feed_item parent appartienne à l'utilisateur dans CE group_id.
-- -----------------------------------------------------------------------------
create policy sessions_select on public.sessions
  for select to authenticated
  using (public.is_group_member(group_id));

create policy sessions_write on public.sessions
  for insert to authenticated
  with check (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id
    )
  );

create policy sessions_modify on public.sessions
  for update to authenticated
  using (
    public.is_group_member(group_id)
    and exists (select 1 from public.feed_items f
                where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id)
  )
  with check (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id
    )
  );

create policy sessions_delete on public.sessions
  for delete to authenticated
  using (exists (select 1 from public.feed_items f
                 where f.id = feed_item_id and f.author_id = auth.uid()));

-- step_logs : pas d'UPDATE volontairement (corriger un compteur = supprimer puis
-- re-logger). Le trigger BEFORE UPDATE existe par défense en profondeur si une
-- politique d'UPDATE est ajoutée plus tard.
create policy step_logs_select on public.step_logs
  for select to authenticated
  using (public.is_group_member(group_id));

create policy step_logs_write on public.step_logs
  for insert to authenticated
  with check (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id
    )
  );

create policy step_logs_delete on public.step_logs
  for delete to authenticated
  using (exists (select 1 from public.feed_items f
                 where f.id = feed_item_id and f.author_id = auth.uid()));

create policy meals_select on public.meals
  for select to authenticated
  using (public.is_group_member(group_id));

create policy meals_write on public.meals
  for insert to authenticated
  with check (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id
    )
  );

create policy meals_modify on public.meals
  for update to authenticated
  using (
    public.is_group_member(group_id)
    and exists (select 1 from public.feed_items f
                where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id)
  )
  with check (
    public.is_group_member(group_id)
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id and f.author_id = auth.uid() and f.group_id = group_id
    )
  );

create policy meals_delete on public.meals
  for delete to authenticated
  using (exists (select 1 from public.feed_items f
                 where f.id = feed_item_id and f.author_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- reactions : membres du groupe ; l'auteur est soi ; suppression par l'auteur.
-- -----------------------------------------------------------------------------
create policy reactions_select on public.reactions
  for select to authenticated
  using (public.is_group_member(group_id));

create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (public.is_group_member(group_id) and author_id = auth.uid());

create policy reactions_delete on public.reactions
  for delete to authenticated
  using (author_id = auth.uid());
