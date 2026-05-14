-- Phase 1 seed — minimal data for the access-control verification cases.
--
-- Deterministic UUIDs are used so test queries can refer to specific rows
-- by id without ad-hoc lookups. Re-running this seed will fail on the
-- unique constraints (which is fine — re-seed by first truncating).
--
-- Resource tree                       Principal tree (groups)
--   Church                              Church Leadership
--   ├── Sector A                        └── Sector A Leadership
--   │   ├── BT 1                            └── BT 1 Leaders
--   │   └── BT 2                                └── Joe (user)
--   └── Sector B
--       └── BT 3
--
-- User 2 is intentionally not a member of anything — used for the
-- "outsider gets nothing" case in Phase 2.

------------------------------------------------------------------------------
-- Resources
------------------------------------------------------------------------------

insert into resources (id, type, parent_id, name) values
  ('aaa00000-0000-0000-0000-000000000001', 'church',     null,                                           'Church'),
  ('aaa00000-0000-0000-0000-00000000000a', 'sector',     'aaa00000-0000-0000-0000-000000000001',          'Sector A'),
  ('aaa00000-0000-0000-0000-00000000000b', 'sector',     'aaa00000-0000-0000-0000-000000000001',          'Sector B'),
  ('aaa00000-0000-0000-0000-0000000000a1', 'bible_talk', 'aaa00000-0000-0000-0000-00000000000a',          'BT 1'),
  ('aaa00000-0000-0000-0000-0000000000a2', 'bible_talk', 'aaa00000-0000-0000-0000-00000000000a',          'BT 2'),
  ('aaa00000-0000-0000-0000-0000000000b1', 'bible_talk', 'aaa00000-0000-0000-0000-00000000000b',          'BT 3');

------------------------------------------------------------------------------
-- Group principals
------------------------------------------------------------------------------

insert into principals (id, kind, name) values
  ('bbb00000-0000-0000-0000-000000000001', 'group', 'Church Leadership'),
  ('bbb00000-0000-0000-0000-00000000000a', 'group', 'Sector A Leadership'),
  ('bbb00000-0000-0000-0000-0000000000a1', 'group', 'BT 1 Leaders');

------------------------------------------------------------------------------
-- Group-in-group membership edges
--   BT 1 Leaders ∈ Sector A Leadership ∈ Church Leadership
------------------------------------------------------------------------------

insert into principal_members (parent_id, member_id) values
  ('bbb00000-0000-0000-0000-000000000001', 'bbb00000-0000-0000-0000-00000000000a'), -- SecA Ldr ∈ Church Ldr
  ('bbb00000-0000-0000-0000-00000000000a', 'bbb00000-0000-0000-0000-0000000000a1'); -- BT1 Ldr ∈ SecA Ldr

------------------------------------------------------------------------------
-- Test auth users
--
-- Inserted directly into auth.users so create_app_user's FK to auth.users
-- is satisfied. crypt() needs pgcrypto, which Supabase ships enabled by
-- default. Passwords are placeholder values — these accounts only exist
-- to exercise the access-control model.
------------------------------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, is_anonymous
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joe@example.com',
   crypt('joe-password-dev', gen_salt('bf')), now(),
   now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, false, false),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user2@example.com',
   crypt('user2-password-dev', gen_salt('bf')), now(),
   now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   false, false, false);

-- Identities are required for email/password sign-in to work.
insert into auth.identities (
  id, user_id, provider_id, provider,
  identity_data,
  last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email',
   jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'joe@example.com', 'email_verified', true),
   now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email',
   jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'user2@example.com', 'email_verified', true),
   now(), now(), now());

------------------------------------------------------------------------------
-- App-level user rows via the helper. Same UUIDs as auth.users above.
------------------------------------------------------------------------------

select create_app_user('11111111-1111-1111-1111-111111111111', 'Joe');
select create_app_user('22222222-2222-2222-2222-222222222222', 'User Two');

------------------------------------------------------------------------------
-- Joe joins BT 1 Leaders. User 2 stays unattached.
------------------------------------------------------------------------------

insert into principal_members (parent_id, member_id) values
  ('bbb00000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111');

------------------------------------------------------------------------------
-- Phase 2 — Test policies for the can() verification cases.
--
-- Three rows, each chosen to exercise one axis of the policy model:
--   1. Group at the root with a domain perm     -> principal & resource
--                                                  ancestry both walk.
--   2. Group at a subtree with a domain perm    -> principal ancestry walks,
--                                                  resource stays in subtree.
--   3. Policy attached directly to a user       -> tests that user principals
--      principal                                   participate without a group.
------------------------------------------------------------------------------

insert into policies (principal_id, permission, resource_id) values
  ('bbb00000-0000-0000-0000-000000000001', 'stats.read',   'aaa00000-0000-0000-0000-000000000001'), -- Church Ldr -> read Church
  ('bbb00000-0000-0000-0000-00000000000a', 'stats.write',  'aaa00000-0000-0000-0000-00000000000a'), -- Sector A Ldr -> write Sector A
  ('11111111-1111-1111-1111-111111111111', 'stats.delete', 'aaa00000-0000-0000-0000-0000000000a1'); -- Joe (user) -> delete BT 1
