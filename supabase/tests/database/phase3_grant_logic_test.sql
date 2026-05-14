-- Phase 3 — Grant logic, RLS on policies, stopgap RLS on Phase 1 tables
--
-- TDD: this file fails until 20260514120000_grant_logic_and_rls.sql is
-- applied. Once applied, every assertion below should pass.
--
-- Five sections:
--   1. Existence + rename + RLS-enabled flags + the locked search_path
--      hardening on the new SECURITY DEFINER function.
--   2. can_grant() truth table -- four representative inputs that cover
--      "has perm + has grant", "no perm in this subtree", "missing
--      grant-grant", and "completely unrelated user".
--   3. grant_permission() under different identities -- no auth, as Joe
--      (has perms), as User Two (has nothing), idempotency on duplicate
--      triples, and the grant-grant gating for delegating grant itself.
--   4. RLS on policies -- read filtering by my_effective_principals,
--      and the default-deny on direct INSERT.
--   5. Stopgap RLS on the Phase 1 tables -- authenticated reads pass,
--      authenticated writes are denied, anon sees nothing.

begin;
set local search_path = public, extensions;
select plan(32);

-- =========================================================================
-- 1. Existence, rename, hardening
-- =========================================================================

-- The rename happened: app_permission exists, permission does not.
select has_type('app_permission',  'enum renamed to app_permission');
select hasnt_type('permission',    'old name `permission` is gone');

-- The two new functions exist (name only; arg-type names depend on the
-- rename and are covered by the type asserts above).
select has_function('public', 'can_grant',         'can_grant() exists');
select has_function('public', 'grant_permission',  'grant_permission() exists');

-- grant_permission is SECURITY DEFINER (so it can bypass RLS to write
-- after can_grant approves -- the whole point).
select is(
  (select prosecdef
   from pg_proc where proname = 'grant_permission' and pronamespace = 'public'::regnamespace),
  true,
  'grant_permission is SECURITY DEFINER'
);

-- Both new functions have search_path pinned -- closes the
-- function_search_path_mutable advisor.
select ok(
  exists(
    select 1 from pg_proc
    where proname = 'grant_permission'
      and pronamespace = 'public'::regnamespace
      and array_to_string(proconfig, ',') like '%search_path=%'
  ),
  'grant_permission has search_path locked'
);
select ok(
  exists(
    select 1 from pg_proc
    where proname = 'can_grant'
      and pronamespace = 'public'::regnamespace
      and array_to_string(proconfig, ',') like '%search_path=%'
  ),
  'can_grant has search_path locked'
);

-- RLS is enabled on policies + the four Phase 1 tables.
select is(
  (select relrowsecurity from pg_class where relname = 'policies'         and relnamespace = 'public'::regnamespace),
  true, 'RLS enabled on policies'
);
select is(
  (select relrowsecurity from pg_class where relname = 'resources'        and relnamespace = 'public'::regnamespace),
  true, 'RLS enabled on resources (stopgap)'
);
select is(
  (select relrowsecurity from pg_class where relname = 'principals'       and relnamespace = 'public'::regnamespace),
  true, 'RLS enabled on principals (stopgap)'
);
select is(
  (select relrowsecurity from pg_class where relname = 'principal_members' and relnamespace = 'public'::regnamespace),
  true, 'RLS enabled on principal_members (stopgap)'
);
select is(
  (select relrowsecurity from pg_class where relname = 'app_users'        and relnamespace = 'public'::regnamespace),
  true, 'RLS enabled on app_users (stopgap)'
);

-- The one named SELECT policy on policies. (Writes are denied by
-- default-deny, so there's intentionally no write policy to assert.)
select policies_are(
  'public', 'policies',
  array['policies_select_own'],
  'policies has exactly the policies_select_own policy and nothing else'
);

-- =========================================================================
-- 2. can_grant truth table
-- =========================================================================

-- Joe holds stats.write + grant on Sector A; BT 1 is under Sector A.
select ok(
  (select can_grant(
    '11111111-1111-1111-1111-111111111111'::uuid,
    'stats.write'::app_permission,
    'aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'can_grant(Joe, stats.write, BT 1) = true'
);

-- BT 3 lives in Sector B; Joe has no perms there.
select ok(
  not (select can_grant(
    '11111111-1111-1111-1111-111111111111'::uuid,
    'stats.write'::app_permission,
    'aaa00000-0000-0000-0000-0000000000b1'::uuid)),
  'can_grant(Joe, stats.write, BT 3) = false (Sector B, outside ancestry)'
);

-- Joe has `grant` but not `grant-grant`, so delegating `grant` itself fails.
select ok(
  not (select can_grant(
    '11111111-1111-1111-1111-111111111111'::uuid,
    'grant'::app_permission,
    'aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'can_grant(Joe, grant, BT 1) = false (lacks grant-grant)'
);

-- User Two has nothing at all.
select ok(
  not (select can_grant(
    '22222222-2222-2222-2222-222222222222'::uuid,
    'stats.write'::app_permission,
    'aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'can_grant(User Two, stats.write, BT 1) = false (no perms)'
);

-- =========================================================================
-- 3. grant_permission under different identities
-- =========================================================================

-- With no auth.uid() set (postgres role, no JWT claims), the function
-- raises the "must be authenticated" guard early.
select throws_ok(
  $$ select grant_permission(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'stats.write'::app_permission,
       'aaa00000-0000-0000-0000-0000000000a1'::uuid) $$,
  'must be authenticated',
  'grant_permission raises when auth.uid() is null'
);

-- Switch to authenticated as Joe.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Joe grants stats.write to User Two on BT 1 -> success.
select lives_ok(
  $$ select grant_permission(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'stats.write'::app_permission,
       'aaa00000-0000-0000-0000-0000000000a1'::uuid) $$,
  'Joe grants stats.write to User Two on BT 1'
);

-- Verify the row landed. Joe himself CAN'T see it via RLS -- the row's
-- principal_id is User Two, who isn't in Joe's effective principals --
-- so we briefly drop back to postgres for the bare-existence check, then
-- re-enter Joe's identity for the rest of the section. (This is a real
-- property of the system worth knowing: granting and observing are
-- separate capabilities.)
reset role;
reset "request.jwt.claims";

select ok(
  exists(
    select 1 from policies
    where principal_id = '22222222-2222-2222-2222-222222222222'
      and permission   = 'stats.write'::app_permission
      and resource_id  = 'aaa00000-0000-0000-0000-0000000000a1'
  ),
  'grant_permission inserted the expected policy row'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Calling grant_permission again with the same triple returns null --
-- the on-conflict clause swallows the duplicate without raising.
select is(
  (select grant_permission(
     '22222222-2222-2222-2222-222222222222'::uuid,
     'stats.write'::app_permission,
     'aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  null,
  'grant_permission is idempotent on duplicate triples (returns null)'
);

-- Joe cannot delegate `grant` itself -- he lacks grant-grant.
-- Use throws_like because the error message includes the resource UUID
-- and permission as a variable suffix ("not authorized to grant grant
-- on <uuid>"); throws_ok requires exact match.
select throws_like(
  $$ select grant_permission(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'grant'::app_permission,
       'aaa00000-0000-0000-0000-0000000000a1'::uuid) $$,
  '%not authorized%',
  'Joe without grant-grant cannot delegate `grant`'
);

-- Switch to User Two -- has no permissions anywhere.
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_like(
  $$ select grant_permission(
       '11111111-1111-1111-1111-111111111111'::uuid,
       'stats.read'::app_permission,
       'aaa00000-0000-0000-0000-0000000000a1'::uuid) $$,
  '%not authorized%',
  'User Two cannot grant anything (no perms)'
);

-- Switch back to postgres to elevate-insert grant-grant for Joe,
-- then retry the delegation as Joe.
reset role;
reset "request.jwt.claims";

insert into policies (principal_id, permission, resource_id)
values (
  '11111111-1111-1111-1111-111111111111',
  'grant-grant'::app_permission,
  'aaa00000-0000-0000-0000-00000000000a'  -- Sector A; covers BT 1
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select grant_permission(
       '22222222-2222-2222-2222-222222222222'::uuid,
       'grant'::app_permission,
       'aaa00000-0000-0000-0000-0000000000a1'::uuid) $$,
  'Joe with grant-grant can now delegate grant'
);

-- =========================================================================
-- 4. RLS on policies (still acting as Joe from above)
-- =========================================================================

-- Joe can read at least the policies in his ancestry.
select ok(
  (select count(*) from policies) > 0,
  'Joe sees at least one policy through RLS (his ancestry has policies attached)'
);

-- Joe cannot INSERT into policies directly -- the only sanctioned write
-- path is grant_permission, which is SECURITY DEFINER and bypasses RLS
-- AFTER the can_grant check.
select throws_ok(
  $$ insert into policies (principal_id, permission, resource_id)
     values ('22222222-2222-2222-2222-222222222222',
             'stats.read'::app_permission,
             'aaa00000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'authenticated cannot directly INSERT into policies (RLS deny)'
);

-- Switch to User Two: he has no group ancestry, so SELECT returns only
-- rows attached directly to his user-principal.
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select distinct principal_id::text from policies $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::text) $$,
  'User Two only sees policies attached directly to him (via RLS)'
);

-- =========================================================================
-- 5. Stopgap RLS on Phase 1 tables
-- =========================================================================

-- Switch back to Joe (any authenticated identity works) for read tests.
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from resources),
  6,
  'authenticated user reads all 6 seeded resources'
);

-- Direct writes are denied to authenticated -- no INSERT policy, so
-- default-deny applies.
select throws_ok(
  $$ insert into resources (type, name) values ('church', 'Rogue Church') $$,
  '42501',
  null,
  'authenticated cannot INSERT into resources (default-deny)'
);

-- Switch to anon. The stopgap policies were `TO authenticated`, so anon
-- has no permissive policy and sees zero rows on every protected table.
reset "request.jwt.claims";
set local role anon;

select is(
  (select count(*)::int from resources),
  0,
  'anon sees no resources (stopgap is TO authenticated only)'
);
select is(
  (select count(*)::int from principals),
  0,
  'anon sees no principals'
);
select is(
  (select count(*)::int from app_users),
  0,
  'anon sees no app_users'
);

reset role;

select * from finish();
rollback;
