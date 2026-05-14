-- Phase 1 — Resources, principals, app_users
--
-- Two halves:
--   1. Schema shape -- enums, tables, columns, PKs, FKs. These catch any
--      structural regression in the migration (a dropped column, a loosened
--      not-null, a missing FK).
--   2. Seed-tree invariants -- the tree shape later phase tests rely on.
--      If anyone edits seed.sql in a way that breaks the church >
--      sectors > BTs / Church-Ldr > SectorA-Ldr > BT1-Ldr layout,
--      this is where they find out.
--
-- Behavioural tests (can(), grant logic) live in their own files; this
-- one stays focused on "is the foundation the right shape."

begin;
set local search_path = public, extensions;
select plan(35);

-- =========================================================================
-- Enums
-- =========================================================================

select has_type('resource_type',  'resource_type type exists');
select has_type('principal_kind', 'principal_kind type exists');

select enum_has_labels(
  'public', 'resource_type',
  array['church','sector','bible_talk'],
  'resource_type has the three expected values'
);
select enum_has_labels(
  'public', 'principal_kind',
  array['user','group'],
  'principal_kind has user + group'
);

-- =========================================================================
-- Tables
-- =========================================================================

select has_table('public', 'resources',         'resources table exists');
select has_table('public', 'principals',        'principals table exists');
select has_table('public', 'principal_members', 'principal_members table exists');
select has_table('public', 'app_users',         'app_users table exists');

-- =========================================================================
-- Not-null business columns
--   Anything domain logic depends on being non-null gets pinned here.
-- =========================================================================

select col_not_null('public', 'resources',  'type', 'resources.type NOT NULL');
select col_not_null('public', 'resources',  'name', 'resources.name NOT NULL');
select col_not_null('public', 'principals', 'kind', 'principals.kind NOT NULL');
select col_not_null('public', 'principals', 'name', 'principals.name NOT NULL');

-- =========================================================================
-- Primary keys
-- =========================================================================

select has_pk('public', 'resources',         'resources has PK');
select has_pk('public', 'principals',        'principals has PK');
select has_pk('public', 'principal_members', 'principal_members has composite PK');
select has_pk('public', 'app_users',         'app_users has PK');

-- =========================================================================
-- Foreign keys
--   We assert the relationship, not the cascade mode -- the latter is
--   exercised by behaviour tests below.
-- =========================================================================

select fk_ok('public', 'resources',         'parent_id', 'public', 'resources',  'id', 'resources.parent_id -> resources.id');
select fk_ok('public', 'principal_members', 'parent_id', 'public', 'principals', 'id', 'principal_members.parent_id -> principals.id');
select fk_ok('public', 'principal_members', 'member_id', 'public', 'principals', 'id', 'principal_members.member_id -> principals.id');

-- app_users.id has TWO FKs (principals and auth.users) on the same column.
-- pgTAP's fk_ok picks one arbitrarily, so we assert both via pg_constraint
-- in a single check.
select ok(
  exists(select 1 from pg_constraint
         where conrelid = 'public.app_users'::regclass
           and contype  = 'f'
           and confrelid = 'public.principals'::regclass)
  and
  exists(select 1 from pg_constraint
         where conrelid = 'public.app_users'::regclass
           and contype  = 'f'
           and confrelid = 'auth.users'::regclass),
  'app_users.id has FKs to both principals and auth.users'
);

-- =========================================================================
-- The create_app_user helper exists with the expected signature
-- =========================================================================

select has_function(
  'public', 'create_app_user', array['uuid','text'],
  'create_app_user(uuid, text) exists'
);

-- =========================================================================
-- Self-loop guard on principal_members
--   The CHECK constraint must prevent a principal being its own parent;
--   otherwise the recursive walk in my_effective_principals could loop
--   on a malformed row.
-- =========================================================================

select throws_ok(
  $$ insert into principal_members (parent_id, member_id)
     values ('11111111-1111-1111-1111-111111111111',
             '11111111-1111-1111-1111-111111111111') $$,
  '23514',  -- check_violation
  null,
  'principal_members rejects a self-loop (parent_id = member_id)'
);

-- =========================================================================
-- Seed: resource tree shape
--   6 resources total: 1 church (root) + 2 sectors + 3 bible talks.
-- =========================================================================

select is(
  (select count(*)::int from resources),
  6,
  'seed loaded exactly 6 resources'
);
select is(
  (select count(*)::int from resources where parent_id is null),
  1,
  'exactly one root resource'
);
select is(
  (select type::text from resources where parent_id is null),
  'church',
  'root resource is a church'
);
select is(
  (select count(*)::int from resources where type = 'sector'),
  2,
  'two sectors'
);
select is(
  (select count(*)::int from resources where type = 'bible_talk'),
  3,
  'three bible talks'
);

-- =========================================================================
-- Seed: principal tree shape
--   3 group principals, 2 user principals, 2 app_users rows.
-- =========================================================================

select is(
  (select count(*)::int from principals where kind = 'group'),
  3,
  'three group principals seeded'
);
select is(
  (select count(*)::int from principals where kind = 'user'),
  2,
  'two user principals seeded'
);
select is(
  (select count(*)::int from app_users),
  2,
  'two app_users rows seeded (mirrors user principals)'
);

-- Same UUID must thread through principals AND app_users for each user
select ok(
  exists(
    select 1
    from principals p join app_users u on u.id = p.id
    where p.id = '11111111-1111-1111-1111-111111111111' and p.kind = 'user'
  ),
  'Joe is consistent across principals and app_users (same UUID)'
);

-- =========================================================================
-- Seed: membership edges
--   Joe -> BT 1 Ldr -> Sector A Ldr -> Church Ldr.
--   These are the edges the principal walker climbs.
-- =========================================================================

select ok(
  exists(
    select 1 from principal_members
    where parent_id = 'bbb00000-0000-0000-0000-0000000000a1'
      and member_id = '11111111-1111-1111-1111-111111111111'
  ),
  'Joe is a member of BT 1 Leaders'
);
select ok(
  exists(
    select 1 from principal_members
    where parent_id = 'bbb00000-0000-0000-0000-00000000000a'
      and member_id = 'bbb00000-0000-0000-0000-0000000000a1'
  ),
  'BT 1 Leaders is a member of Sector A Leadership'
);
select ok(
  exists(
    select 1 from principal_members
    where parent_id = 'bbb00000-0000-0000-0000-000000000001'
      and member_id = 'bbb00000-0000-0000-0000-00000000000a'
  ),
  'Sector A Leadership is a member of Church Leadership'
);

-- User Two is intentionally unaffiliated -- preserves the "outsider gets
-- nothing" case for Phase 2's negative tests.
select is(
  (select count(*)::int from principal_members
   where member_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'User Two has no group memberships (outsider fixture preserved)'
);

select * from finish();
rollback;
