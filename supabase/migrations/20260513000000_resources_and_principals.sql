-- Phase 1 — Resources and principals
--
-- Creates the two trees the access-control layer rests on:
--   1. resources: church → sector → bible_talk (parent_id self-reference)
--   2. principals: users + groups, with membership edges that can be walked
--      upward to find every principal a given user "is".
--
-- app_users is the user-facing profile half of a user principal. The id is
-- shared across principals.id, app_users.id, and auth.users.id so a single
-- UUID per person threads through the whole schema and auth.uid() is directly
-- usable as a principal id.

------------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------------

create type resource_type as enum ('church', 'sector', 'bible_talk');
create type principal_kind as enum ('user', 'group');

------------------------------------------------------------------------------
-- Resources: the church → sector → bible_talk tree
------------------------------------------------------------------------------

create table resources (
  id          uuid primary key default gen_random_uuid(),
  type        resource_type not null,
  parent_id   uuid references resources(id) on delete restrict,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index on resources (parent_id);

------------------------------------------------------------------------------
-- Principals: every actor that can hold a policy. Users and groups share
-- this table — no discriminator needed at the policy level.
------------------------------------------------------------------------------

create table principals (
  id          uuid primary key default gen_random_uuid(),
  kind        principal_kind not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Membership edges. (parent_id, member_id) covers both user-in-group
-- and group-in-group. Walked upward from a user to find every principal
-- they "are".
create table principal_members (
  parent_id   uuid not null references principals(id) on delete cascade,
  member_id   uuid not null references principals(id) on delete cascade,
  primary key (parent_id, member_id),
  check (parent_id <> member_id)
);
create index on principal_members (member_id);

------------------------------------------------------------------------------
-- app_users: profile row for user principals. Same id as principals & auth.
------------------------------------------------------------------------------

create table app_users (
  id           uuid primary key references principals(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  -- The same id also references auth.users; this enforces the link.
  constraint app_users_auth_link
    foreign key (id) references auth.users(id) on delete cascade
);

------------------------------------------------------------------------------
-- create_app_user: provisions both the principal row and the profile row
-- atomically, keyed to the auth.users id.
------------------------------------------------------------------------------

create or replace function create_app_user(
  p_auth_user_id  uuid,
  p_display_name  text
) returns uuid
language plpgsql as $$
begin
  insert into principals (id, kind, name)
  values (p_auth_user_id, 'user', p_display_name);

  insert into app_users (id, display_name)
  values (p_auth_user_id, p_display_name);

  return p_auth_user_id;
end;
$$;
