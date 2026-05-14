-- Phase 2 — Policies and the can() function
--
-- Adds the policy store and the single SQL question every RLS check
-- will eventually answer:
--   can(user, permission, resource) -> bool
--
-- Evaluated as: does ANY policy sit at the intersection of
--   (the user's effective principals) X (the resource's ancestry chain)
-- Two recursive walks, one query.
--
-- RLS on policies + the domain tables comes in Phase 3 (we need can()
-- to exist before its policies can reference it).

------------------------------------------------------------------------------
-- Permission enum
--   Domain perms for the Stats surface + the two meta perms used for
--   delegation (see grant rules in docs/access-control-implementation.md).
------------------------------------------------------------------------------

create type permission as enum (
  'stats.read', 'stats.write', 'stats.create', 'stats.delete',
  'grant', 'grant-grant'
);

------------------------------------------------------------------------------
-- Policies: one row = (principal, permission, resource).
--   - principal_id may be a user or a group (same principals table).
--   - granted_by is the user who issued the grant; nulled out if that user
--     is deleted so the audit row (granted_at) survives.
--   - unique (principal_id, permission, resource_id) makes grant_permission's
--     `on conflict do nothing` (Phase 3) idempotent.
------------------------------------------------------------------------------

create table policies (
  id            uuid primary key default gen_random_uuid(),
  principal_id  uuid not null references principals(id) on delete cascade,
  permission    permission not null,
  resource_id   uuid not null references resources(id) on delete cascade,
  granted_by    uuid references app_users(id) on delete set null,
  granted_at    timestamptz not null default now(),
  unique (principal_id, permission, resource_id)
);
create index on policies (principal_id);
create index on policies (resource_id);

------------------------------------------------------------------------------
-- my_effective_principals(user)
--   The user themselves plus every parent principal reachable by walking
--   principal_members upward. Used by can() below and (Phase 3) by RLS.
--   `union` dedupes — a principal can sit under multiple parents (DAG-safe).
------------------------------------------------------------------------------

create or replace function my_effective_principals(p_user_id uuid)
returns setof uuid
language sql
stable
set search_path = public, pg_catalog
as $$
  with recursive walk as (
    select p_user_id as id
    union
    select pm.parent_id
    from principal_members pm
    join walk w on pm.member_id = w.id
  )
  select id from walk;
$$;

------------------------------------------------------------------------------
-- can(user, permission, resource)
--   Two recursive walks in one query:
--     1. resource_chain — target resource + every ancestor (church > sector
--        > bible_talk). `union all` is safe here: the resource graph is a
--        tree, never a DAG.
--     2. my_effective_principals — user + every parent principal.
--   If any policy row matches (permission, resource_id in chain,
--   principal_id in effective set), return true.
------------------------------------------------------------------------------

create or replace function can(
  p_user_id    uuid,
  p_permission permission,
  p_resource   uuid
) returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  with recursive resource_chain as (
    select id, parent_id from resources where id = p_resource
    union all
    select r.id, r.parent_id
    from resources r
    join resource_chain rc on r.id = rc.parent_id
  )
  select exists (
    select 1
    from policies pol
    where pol.permission   = p_permission
      and pol.resource_id  in (select id from resource_chain)
      and pol.principal_id in (select * from my_effective_principals(p_user_id))
  );
$$;

------------------------------------------------------------------------------
-- Backfill: lock search_path on the Phase 1 helper (closes the advisor
-- WARN "function_search_path_mutable"). Behaviour unchanged.
------------------------------------------------------------------------------

alter function create_app_user(uuid, text) set search_path = public, pg_catalog;
