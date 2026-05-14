-- Phase 3 — Grant logic, RLS on policies, and stopgap RLS on Phase 1 tables
--
-- Two things land together here because they answer the same question from
-- two sides:
--
--   1. can_grant() / grant_permission() decide whether a client is allowed
--      to hand out a permission, and -- because grant_permission() is the
--      only sanctioned write path -- effectively become the entire policy-
--      authoring surface.
--   2. RLS on policies turns "the only sanctioned write path" from policy
--      into mechanism: clients can SELECT only their own ancestry's rows,
--      and direct INSERT/UPDATE/DELETE is denied flat.
--
-- The stopgap RLS on resources / principals / principal_members / app_users
-- closes the Phase 1 risk that anon-key callers could read or mutate the
-- org chart. Read stays open to authenticated (the cache needs to walk it);
-- writes go through service_role only until Phase 8 ships the admin surface.
--
-- Naming prep: the Phase 2 enum was called `permission`, which collides with
-- the `policies.permission` column name. We rename it once here -- function
-- signatures rebind by oid so existing functions don't need editing -- and
-- everything new in Phase 3 uses the clearer name.

------------------------------------------------------------------------------
-- Rename: permission -> app_permission
--   Disambiguates the enum type from the policies.permission column. The
--   rename is oid-stable, so Phase 2's `can()` and `my_effective_principals()`
--   keep working; their pg_proc rows just display the new type name.
------------------------------------------------------------------------------

alter type permission rename to app_permission;

------------------------------------------------------------------------------
-- can_grant(grantor, perm, resource)
--   Three-clause AND, all positive:
--     1. The grantor must hold `perm` on the resource themselves -- you
--        can't hand out what you don't have.
--     2. The grantor must hold `grant` on the resource -- being able to
--        do something is separate from being able to delegate it.
--     3. If `perm` IS `grant`, the grantor must additionally hold
--        `grant-grant` -- a second meta-level so delegation chains are
--        opt-in, not transitive by default.
--
--   Pure SQL, stable -- lets the planner inline it inside RLS expressions
--   later if we ever need that.
------------------------------------------------------------------------------

create or replace function can_grant(
  p_grantor    uuid,
  p_permission app_permission,
  p_resource   uuid
) returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select
    can(p_grantor, p_permission, p_resource)
    and can(p_grantor, 'grant'::app_permission, p_resource)
    and (
      p_permission <> 'grant'::app_permission
      or can(p_grantor, 'grant-grant'::app_permission, p_resource)
    );
$$;

------------------------------------------------------------------------------
-- grant_permission(target, perm, resource) -> new policy id (or null on conflict)
--
--   `security definer` so the insert can bypass the RLS deny on policies --
--   but only AFTER can_grant() has approved. The auth.uid() read is the
--   only piece that depends on the caller's identity; everything else is
--   sandboxed by the function body.
--
--   Locked `search_path` so an attacker can't shadow `policies` or
--   `can_grant` from a writable schema (search_path injection is the
--   classic security-definer footgun).
--
--   `on conflict do nothing` makes the call idempotent: regranting an
--   existing (principal, perm, resource) triple returns null instead of
--   raising, which matches how an "add member" button typically behaves.
------------------------------------------------------------------------------

create or replace function grant_permission(
  p_target_principal_id uuid,
  p_permission          app_permission,
  p_resource            uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_grantor   uuid := auth.uid();
  v_policy_id uuid;
begin
  if v_grantor is null then
    raise exception 'must be authenticated';
  end if;

  if not can_grant(v_grantor, p_permission, p_resource) then
    raise exception 'not authorized to grant % on %', p_permission, p_resource;
  end if;

  insert into policies (principal_id, permission, resource_id, granted_by)
  values (p_target_principal_id, p_permission, p_resource, v_grantor)
  on conflict (principal_id, permission, resource_id) do nothing
  returning id into v_policy_id;

  return v_policy_id;
end;
$$;

------------------------------------------------------------------------------
-- RLS on policies
--
--   SELECT: any row whose principal_id sits in the caller's effective
--   principal set -- i.e. attached to them, a group they're in, or any
--   ancestor of such a group. This is exactly what Phase 5's client cache
--   needs to populate without a separate endpoint.
--
--   INSERT/UPDATE/DELETE: no policy permits them, so RLS denies by default.
--   We don't add an explicit "for all using false" because (a) the default
--   deny is the documented Postgres behaviour and (b) a permissive SELECT
--   policy alongside a deny-all policy would OR together for SELECT, which
--   is a footgun worth not introducing.
------------------------------------------------------------------------------

alter table policies enable row level security;

create policy policies_select_own
  on policies for select
  to authenticated
  using (
    principal_id in (select * from my_effective_principals(auth.uid()))
  );

------------------------------------------------------------------------------
-- Stopgap RLS on the Phase 1 tables
--
--   Without these, an anon-key client could read or mutate the org chart
--   even though our domain logic assumes only admin tooling does. Read
--   stays open to authenticated -- the permission cache and the can()
--   function both need to walk these tables -- and writes are off-limits
--   to clients entirely. Admin writes flow through service_role for now.
--
--   When the admin UI lands in Phase 8 we'll replace these with policies
--   that key off whatever admin permission we settle on.
------------------------------------------------------------------------------

alter table resources         enable row level security;
alter table principals        enable row level security;
alter table principal_members enable row level security;
alter table app_users         enable row level security;

create policy resources_authenticated_read
  on resources for select to authenticated using (true);

create policy principals_authenticated_read
  on principals for select to authenticated using (true);

create policy principal_members_authenticated_read
  on principal_members for select to authenticated using (true);

create policy app_users_authenticated_read
  on app_users for select to authenticated using (true);

------------------------------------------------------------------------------
-- Lock down who can RPC-call grant_permission
--
--   Supabase grants EXECUTE on new public functions to PUBLIC by default,
--   which means the anon role can hit POST /rest/v1/rpc/grant_permission
--   without signing in. The function's own `must be authenticated` guard
--   catches that, but defence-in-depth says don't expose a SECURITY
--   DEFINER surface to anon at all.
--
--   authenticated KEEPS execute -- the Phase 5 client cache and the Phase 8
--   grant UI both call this via RPC. service_role keeps it too for admin
--   tooling. The advisor still warns about authenticated, but that's the
--   intentional shape, not the accident.
------------------------------------------------------------------------------

-- Supabase grants EXECUTE to PUBLIC AND directly to anon/authenticated on
-- new public functions, so revoking from PUBLIC alone leaves anon's direct
-- grant in place. Revoke explicitly from both, then re-grant the roles we
-- do want.
revoke execute on function public.grant_permission(uuid, app_permission, uuid) from public, anon;
grant  execute on function public.grant_permission(uuid, app_permission, uuid) to   authenticated, service_role;
