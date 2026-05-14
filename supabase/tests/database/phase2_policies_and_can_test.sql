-- Phase 2 — Policies and the can() function
--
-- Two halves again:
--   1. Schema -- the policies table, indices, uniqueness; the two new
--      functions exist.
--   2. Behaviour -- my_effective_principals walks the principal tree
--      correctly, and can() returns the right answer for the six
--      verification cases from the plan plus one sibling-isolation case.
--
-- The enum's NAME changes from `permission` to `app_permission` during
-- Phase 3. To keep this file passing across that rename, all enum-related
-- assertions are written in terms of VALUES, not names -- looked up
-- via pg_enum/pg_type without hardcoding either name. The rename itself
-- is the subject of the Phase 3 test.

begin;
set local search_path = public, extensions;
select plan(20);

-- =========================================================================
-- The permission enum exists (under SOME name) with the six expected values
-- =========================================================================

select is(
  (
    select array_agg(enumlabel order by enumsortorder)
    from pg_enum
    where enumtypid = (
      select oid from pg_type
      where typname in ('permission','app_permission')
        and typnamespace = 'public'::regnamespace
      limit 1
    )
  ),
  array['stats.read','stats.write','stats.create','stats.delete','grant','grant-grant'],
  'permission enum has the six expected values (in declared order)'
);

-- =========================================================================
-- policies table shape
-- =========================================================================

select has_table('public', 'policies', 'policies table exists');
select has_pk('public',    'policies', 'policies has a PK');

select has_column('public', 'policies', 'principal_id', 'policies.principal_id');
select has_column('public', 'policies', 'permission',   'policies.permission');
select has_column('public', 'policies', 'resource_id',  'policies.resource_id');
select has_column('public', 'policies', 'granted_by',   'policies.granted_by');
select has_column('public', 'policies', 'granted_at',   'policies.granted_at');

-- The triple uniqueness is what makes grant_permission's on-conflict
-- idempotency work, so it's worth pinning.
select col_is_unique(
  'public', 'policies',
  array['principal_id','permission','resource_id'],
  'policies (principal_id, permission, resource_id) is unique'
);

-- =========================================================================
-- The two new functions exist (signature checked behaviourally below;
-- a name-agnostic existence check is enough here).
-- =========================================================================

select has_function('public', 'my_effective_principals', 'my_effective_principals() exists');
select has_function('public', 'can',                     'can() exists');

-- =========================================================================
-- my_effective_principals walks the membership graph upward
-- =========================================================================

-- Joe: himself + BT 1 Ldr + Sector A Ldr + Church Ldr = 4 principals.
-- my_effective_principals returns setof uuid, so we * it and order by 1.
select results_eq(
  $$ select * from my_effective_principals('11111111-1111-1111-1111-111111111111') order by 1 $$,
  $$ values
       ('11111111-1111-1111-1111-111111111111'::uuid),
       ('bbb00000-0000-0000-0000-000000000001'::uuid),
       ('bbb00000-0000-0000-0000-00000000000a'::uuid),
       ('bbb00000-0000-0000-0000-0000000000a1'::uuid)
     order by 1 $$,
  'my_effective_principals(Joe) returns Joe + BT1/SecA/Church Ldr'
);

-- User Two: just himself (no group memberships)
select results_eq(
  $$ select * from my_effective_principals('22222222-2222-2222-2222-222222222222') $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'my_effective_principals(User Two) returns only himself'
);

-- =========================================================================
-- The six can() cases that prove principal x resource ancestry both walk
--   Plan rows: 3 positive + 3 negative + 1 sibling-isolation = 7.
-- =========================================================================

-- Positive: stats.read on BT 1 -> true via Church Ldr policy on Church.
--   Principal ancestry climbs 3 levels (Joe -> BT1 Ldr -> SecA Ldr ->
--   Church Ldr); resource ancestry climbs 2 levels (BT1 -> SecA -> Church).
--   The policy sits at the (Church Ldr, Church) intersection.
select ok(
  (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.read',  'aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'Joe CAN stats.read on BT 1 (Church Ldr policy on Church inherits down)'
);
select ok(
  (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.write', 'aaa00000-0000-0000-0000-0000000000a2'::uuid)),
  'Joe CAN stats.write on BT 2 (Sector A Ldr policy on Sector A inherits down)'
);
select ok(
  (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.delete','aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'Joe CAN stats.delete on BT 1 (direct user-principal policy)'
);

-- Direct negative cases
select ok(
  not (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.delete','aaa00000-0000-0000-0000-0000000000a2'::uuid)),
  'Joe CANNOT stats.delete on BT 2 (direct policy is BT-1-only)'
);
select ok(
  not (select can('22222222-2222-2222-2222-222222222222'::uuid, 'stats.read', 'aaa00000-0000-0000-0000-000000000001'::uuid)),
  'User Two CANNOT stats.read on Church (no group memberships)'
);
select ok(
  not (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.create','aaa00000-0000-0000-0000-0000000000a1'::uuid)),
  'Joe CANNOT stats.create on BT 1 (no stats.create policy seeded)'
);

-- Sibling isolation: BT 3 lives under Sector B, where Joe has nothing.
select ok(
  not (select can('11111111-1111-1111-1111-111111111111'::uuid, 'stats.write','aaa00000-0000-0000-0000-0000000000b1'::uuid)),
  'Joe CANNOT stats.write on BT 3 (Sector B is outside his ancestry)'
);

select * from finish();
rollback;
