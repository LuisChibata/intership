# Access Control Implementation Plan

This document is the step-by-step plan for building the access control layer of the church management app, starting with the Stats feature. It captures the design we landed on with the supervisor and the order in which we'll implement it.

The guiding principle: **build the gate before the room**. No Stats UI is written until the permission system that protects Stats works end-to-end.

---

## Why this exists

The Stats feature has to enforce who can read, write, create, and delete which numbers — and who can hand those abilities out to others. Putting that logic ad-hoc inside Stats screens guarantees it will be wrong somewhere. Instead, we build one access-control layer once, prove it works on its own, and then use it everywhere (Stats first, then Finance, Members, etc.).

---

## Design recap

### Principals

A **principal** is anything that can hold a policy. Two kinds:

- `kind = 'user'` — a single person, identified by Supabase Auth. The principal *is* the user; no wrapper row.
- `kind = 'group'` — a collection of members (other principals).

Principals are connected through a **membership** relation: a principal can be a member of one or more parent principals. This forms the org chart. The "tree" in practice — most users are in one or two groups, groups nest under sector/church groups — but the structure is general enough to support a DAG if it ever needs one.

Example shape:

```
Church Leadership            (group)
├── Sector A Leadership      (group)
│   ├── BT 1 Leaders         (group)
│   │   └── Joe              (user)
│   └── BT 2 Leaders         (group)
└── Sector B Leadership      (group)
    └── BT 3 Leaders         (group)
```

Membership is **transitive** upward. Joe's effective principals are: Joe himself, plus every parent principal reachable by walking the membership chain — here, BT 1 Leaders, Sector A Leadership, Church Leadership (four total).

A user's effective policies are the union of every policy attached to any principal in their effective set.

### Resources

Resources form a tree:

```
Church
├── Sector A
│   ├── Bible Talk 1
│   └── Bible Talk 2
└── Sector B
    └── Bible Talk 3
```

Permissions on a node apply to that node **and all descendants**. Siblings are isolated — `stats.write` on Sector A does not reach Sector B.

### Permissions

Domain permissions (Stats, the first surface):

- `stats.read`, `stats.write`, `stats.create`, `stats.delete`

Meta permissions (delegation):

- `grant` — can hand out any permission you yourself hold, on resources you hold it for
- `grant-grant` — can hand out the `grant` permission

Later domains add their own (`finance.read`, `members.write`, …). Same structure, no schema changes needed.

### Policies

A policy is one row:

```
(principal, permission, resource)
```

That's all. The principal can be a user or a group — they're stored in the same table, no discriminator needed at the policy level. No `grantable` boolean. No expiration (for now). No deny rules. Permissions are purely additive — a user's effective access is the union of every policy attached to any principal in their ancestry chain, evaluated against any resource in the target's ancestry chain.

### Grant rules

To grant permission `P` on resource `R` to principal `Q`, the grantor must:

1. Hold `P` on `R` (or any ancestor of `R`)
2. Hold `grant` on `R` (or any ancestor of `R`)
3. If `P` is `grant`, also hold `grant-grant` on `R` (or any ancestor)

`grant-grant` follows the same uniform rule — anyone holding `grant-grant` + `grant` can pass `grant-grant` onward, scoped by the resource tree.

> **Why uniform:** the resource tree already provides containment for `grant-grant` propagation. If Pastor gives `grant-grant` on a sector, the propagation stays inside that sector. The alternative (root-only `grant-grant`) is more restrictive but blocks legitimate patterns like "designate a backup who can also delegate." We can revisit if it causes problems in practice.

---

## Backend: Supabase

- **Postgres** holds `resources`, `principals`, `principal_members`, and `policies`.
- **Postgres functions** (`can`, `can_grant`, `grant_permission`) hold the rules.
- **Row Level Security (RLS)** on domain tables calls `can()` so the database itself rejects unauthorized reads/writes.
- **Flutter** uses `supabase_flutter` for auth + queries.

Client-side permission checks exist only for UI affordances (showing/hiding buttons). The database is the source of truth — every write is re-validated server-side by RLS.

---

## Phase 0 — Foundation

**Goal:** A Supabase project exists, the Flutter app can talk to it, and this plan lives in the repo.

**Tasks:**

1. Create a new Supabase project (free tier) via the dashboard. Region: closest to São Paulo.
2. Copy the project URL and the `anon` public key.
3. Add `supabase_flutter` to `flutter/flutter_application_1/pubspec.yaml`.
4. Add `.env` to `.gitignore`. Store the URL + anon key in `flutter/flutter_application_1/.env` (never commit).
5. Push this document and the existing `Claude_Design_Stats_Prototype/` folder to GitHub on a feature branch.

**Verification:**

- `flutter pub get` succeeds with the new dependency.
- This plan is visible on GitHub.

**Files touched:**

- `flutter/flutter_application_1/pubspec.yaml`
- `flutter/flutter_application_1/.env` (gitignored)
- `.gitignore`
- `docs/access-control-implementation.md` (this file)

---

## Phase 1 — Resources and principals

**Goal:** The database can represent the church's tree and its people.

**DDL (draft):**

```sql
create type resource_type as enum ('church', 'sector', 'bible_talk');

create table resources (
  id          uuid primary key default gen_random_uuid(),
  type        resource_type not null,
  parent_id   uuid references resources(id) on delete restrict,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index on resources (parent_id);

-- Every actor that can hold a policy. Users and groups live here together.
create type principal_kind as enum ('user', 'group');

create table principals (
  id          uuid primary key default gen_random_uuid(),
  kind        principal_kind not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Membership edges. A principal can be a member of one or more parents.
-- (parent_id, member_id) covers both user-in-group and group-in-group.
create table principal_members (
  parent_id   uuid not null references principals(id) on delete cascade,
  member_id   uuid not null references principals(id) on delete cascade,
  primary key (parent_id, member_id),
  check (parent_id <> member_id)
);
create index on principal_members (member_id);

-- App-level profile for user principals. The id is shared across
-- principals, app_users, and auth.users — one UUID per person.
create table app_users (
  id           uuid primary key references principals(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  -- Same id also references auth.users; this enforces the link.
  constraint app_users_auth_link
    foreign key (id) references auth.users(id) on delete cascade
);
```

**Helper for user provisioning** (creates the principal row and the profile row atomically, both keyed to the auth user's UUID):

```sql
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
```

Because the user's principal id, profile id, and auth-user id are the same UUID, `auth.uid()` is directly usable as a principal id throughout the rest of the schema.

**Tasks:**

1. Create a new migration: `supabase migration new resources_and_principals`.
2. Paste the DDL + `create_app_user` helper into the migration file.
3. Apply it locally and to the remote project.
4. Seed minimal data:
   - Resource tree: Church → Sector A → BT 1, BT 2. Church → Sector B → BT 3.
   - Group principals (kind='group'): "Church Leadership", "Sector A Leadership", "BT 1 Leaders".
   - Membership edges: BT 1 Leaders ∈ Sector A Leadership ∈ Church Leadership.
   - Two test users via `create_app_user(...)`. Add user 1 (Joe) as a member of "BT 1 Leaders". Leave user 2 with no memberships.

**Verification:**

- `select * from resources` shows the seed tree.
- A recursive ancestor query on a leaf BT returns three rows (BT, Sector, Church):

  ```sql
  with recursive ancestry as (
    select id, parent_id from resources where id = '<bible_talk_1>'
    union all
    select r.id, r.parent_id from resources r
    join ancestry a on r.id = a.parent_id
  )
  select * from ancestry;
  ```

- Walking the membership chain upward from "BT 1 Leaders" via `principal_members` returns three rows (BT 1 Leaders, Sector A Leadership, Church Leadership).
- Joe's effective principals (himself + every ancestor reachable via membership) total **four**: Joe, BT 1 Leaders, Sector A Leadership, Church Leadership.

---

## Phase 2 — Policies and the `can()` function

**Goal:** A single SQL function answers "can user `X` do permission `P` on resource `R`?" given the policy table.

**DDL (draft):**

```sql
create type permission as enum (
  'stats.read', 'stats.write', 'stats.create', 'stats.delete',
  'grant', 'grant-grant'
);

create table policies (
  id            uuid primary key default gen_random_uuid(),
  principal_id  uuid not null references principals(id) on delete cascade,
  permission    permission not null,
  resource_id   uuid not null references resources(id) on delete cascade,
  granted_by    uuid references app_users(id),
  granted_at    timestamptz not null default now(),
  unique (principal_id, permission, resource_id)
);
create index on policies (principal_id);
create index on policies (resource_id);
```

**Helper — a user's effective principals** (used by `can()` and by RLS):

```sql
-- Self + every ancestor principal reachable by walking principal_members upward.
create or replace function my_effective_principals(p_user_id uuid)
returns setof uuid
language sql stable as $$
  with recursive walk as (
    -- The user themselves is a principal.
    select p_user_id as id
    union
    -- Anything that has us as a member.
    select pm.parent_id
    from principal_members pm
    join walk w on pm.member_id = w.id
  )
  select id from walk;
$$;
```

**Function:**

```sql
create or replace function can(
  p_user_id    uuid,
  p_permission permission,
  p_resource   uuid
) returns boolean
language sql stable as $$
  with recursive resource_chain as (
    -- Start at the target resource
    select id, parent_id from resources where id = p_resource
    union all
    -- Walk upward
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
```

Two recursive walks, one query: **principal ancestry × resource ancestry**. If any policy sits at the intersection, the answer is true.

**Tasks:**

1. Apply the schema + helper + `can()` as a migration.
2. Seed test policies (on top of the Phase 1 seed: Joe is a member of "BT 1 Leaders" only):
   - `("Church Leadership", 'stats.read', church_root)` — everyone under Church Leadership can read everything.
   - `("Sector A Leadership", 'stats.write', sector_a)` — Sector A leaders can write within Sector A.
   - `(Joe, 'stats.delete', bt_1)` — Joe individually can delete on BT 1 (policy attached to Joe's user principal).
3. Manually call `can()` for the cases listed below.

**Verification — all six must pass:**

| Case                                            | Call                                          | Expected |
| ----------------------------------------------- | --------------------------------------------- | -------- |
| Principal ancestry reaches a policy             | `can(joe, 'stats.write', bt_1)`               | `true`   |
| Resource ancestry distributes downward          | `can(joe, 'stats.read', bt_1)` (via Church Leadership → stats.read → Church) | `true`   |
| Policy attached directly to user principal hits | `can(joe, 'stats.delete', bt_1)`              | `true`   |
| Direct policy is correctly scoped               | `can(joe, 'stats.delete', bt_2)`              | `false`  |
| Resource-tree sibling isolation                 | `can(joe, 'stats.write', bt_3)` (a BT in Sector B) | `false`  |
| Outsider gets nothing                           | `can(user_2, 'stats.write', bt_1)` (user_2 has no memberships and no direct policies) | `false`  |

---

## Phase 3 — Grant logic

**Goal:** The server enforces the grant rules. A client can never insert a policy it isn't entitled to insert.

**Functions:**

```sql
create or replace function can_grant(
  p_grantor    uuid,
  p_permission permission,
  p_resource   uuid
) returns boolean
language sql stable as $$
  select
    can(p_grantor, p_permission, p_resource)
    and can(p_grantor, 'grant', p_resource)
    and (
      p_permission <> 'grant'
      or can(p_grantor, 'grant-grant', p_resource)
    );
$$;

create or replace function grant_permission(
  p_target_principal_id  uuid,  -- any principal: user or group
  p_permission           permission,
  p_resource             uuid
) returns uuid
language plpgsql security definer as $$
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
  on conflict do nothing
  returning id into v_policy_id;

  return v_policy_id;
end;
$$;
```

`security definer` lets this function bypass RLS to insert into `policies`, but only **after** `can_grant` has approved.

**RLS on `policies`:**

```sql
alter table policies enable row level security;

-- A user can read every policy attached to any principal in their ancestry chain,
-- so the client can build its permission cache.
create policy "read own policies"
  on policies for select
  using (
    principal_id in (select * from my_effective_principals(auth.uid()))
  );

-- No direct writes from clients — must go through grant_permission().
create policy "no direct writes"
  on policies for all
  using (false)
  with check (false);
```

**Tasks:**

1. Apply migration.
2. Seed: attach to Jordan (his user principal) `stats.write` + `grant` on a sector, but **not** `grant-grant`.
3. Sign in as Jordan; call `grant_permission(marin_user_id, 'stats.write', bt_in_sector)` → expect success.
4. Sign in as Jordan; call `grant_permission(marin_user_id, 'grant', bt_in_sector)` → expect failure (`not authorized`).
5. Give Jordan `grant-grant` on the sector; retry step 4 → expect success.
6. Attempt a raw `insert into policies ...` from an authenticated client → expect failure (RLS).

**Verification:** every case above behaves exactly as expected.

---

## Phase 4 — Flutter connects to Supabase

**Goal:** The app can sign a user in and read their identity.

**Tasks:**

1. Initialize `Supabase.initialize(url: ..., anonKey: ...)` in `main.dart`, reading from `.env`.
2. Build a minimal email/password login screen.
3. After login, fetch the user's row from `app_users` and display their display name.
4. Add a sign-out button.

**Verification:**

- Logging in with a seeded user shows their name on screen.
- Restarting the app keeps them logged in (session persistence).

**Files:**

- `lib/main.dart`
- `lib/auth/login_screen.dart`
- `lib/auth/auth_service.dart`

---

## Phase 5 — Permission cache on the client

**Goal:** After login, the client knows the user's effective policies so the UI can show/hide things without round-trips.

**Tasks:**

1. On login, fetch the user's policies. RLS already filters this — a plain `supabase.from('policies').select('*')` returns only their visible rows.
2. Fetch the resource tree (small, full table).
3. Build a Dart `AccessControl` class:

   ```dart
   class AccessControl {
     final List<Policy> policies;
     final Map<String, String?> parents; // resource_id -> parent_id (null at root)

     bool can(Permission p, String resourceId) {
       // walk ancestors of resourceId, check for matching policy
     }

     bool canGrant(Permission p, String resourceId) {
       if (!can(p, resourceId)) return false;
       if (!can(Permission.grant, resourceId)) return false;
       if (p == Permission.grant && !can(Permission.grantGrant, resourceId)) return false;
       return true;
     }
   }
   ```

4. Expose it via a provider/InheritedWidget so any screen can read it.

**Verification:**

- A read-only user sees no "Add stats" button anywhere.
- A user with `stats.write` on one sector sees the edit button only inside that sector's pages.

> **Reminder:** this cache is for UX, not security. Every write still goes through Supabase, which validates independently via RLS. If the cache is stale or tampered with, the server still says no.

**Files:**

- `lib/access_control/permission.dart`
- `lib/access_control/access_control.dart`
- `lib/access_control/access_control_provider.dart`

---

## Phase 6 — Stats domain schema

**Goal:** The actual Stats data exists, with RLS gating access via `can()`.

**DDL (draft — will refine against the prototype):**

```sql
create table weekly_reports (
  id             uuid primary key default gen_random_uuid(),
  bible_talk_id  uuid not null references resources(id) on delete cascade,
  week_of        date not null,
  attendance     int  not null check (attendance >= 0),
  visitors       int  not null default 0 check (visitors >= 0),
  notes          text,
  created_by     uuid references app_users(id),
  created_at     timestamptz not null default now(),
  unique (bible_talk_id, week_of)
);
```

**RLS:**

```sql
alter table weekly_reports enable row level security;

create policy "read if stats.read"
  on weekly_reports for select
  using (can(auth.uid(), 'stats.read', bible_talk_id));

create policy "insert if stats.create"
  on weekly_reports for insert
  with check (can(auth.uid(), 'stats.create', bible_talk_id));

create policy "update if stats.write"
  on weekly_reports for update
  using       (can(auth.uid(), 'stats.write', bible_talk_id))
  with check  (can(auth.uid(), 'stats.write', bible_talk_id));

create policy "delete if stats.delete"
  on weekly_reports for delete
  using (can(auth.uid(), 'stats.delete', bible_talk_id));
```

**Tasks:**

1. Apply migration.
2. Seed a few weekly reports across both sectors.
3. As a user with `stats.read` on one sector only: `select * from weekly_reports` → only that sector's rows appear.
4. As that user: attempt to `insert` for a different sector → rejected.

**Verification:** cross-sector isolation works at the DB layer with no application code involved.

---

## Phase 7 — Stats screen

**Goal:** A working Stats screen in Flutter that reads, writes, and respects permissions.

**Tasks:**

1. Port the chosen prototype variant (A or B — decide before starting) into Flutter widgets.
2. Wire the list to `supabase.from('weekly_reports').select(...)`.
3. Wire the "add" and "edit" forms to insert/update.
4. Use `AccessControl.can(...)` to gate buttons in the UI.
5. Show meaningful errors when the server rejects an action (don't fail silently).

**Verification:**

- The screen works for a BT leader (their BT only), a sector leader (their sector), and a read-only member (everything visible, no edit).
- Pulling the plug on the cache (manually clearing it) and trying to write still gets rejected by the server.

---

## Phase 8 — Grant UI

**Goal:** A user with `grant` can hand out permissions through the app.

**Tasks:**

1. Build a "Manage Access" screen reachable from a resource's settings.
2. List the policies currently attached to this resource.
3. Show the permissions the current user is allowed to grant here (computed from `canGrant`).
4. Form: pick a target principal (user or group), pick a permission, submit → call the `grant_permission` RPC.
5. Handle errors (already exists, no permission, etc.).
6. Add a `revoke_permission(policy_id)` RPC that mirrors `grant_permission`'s checks for symmetry.

**Verification:**

- A sector leader can grant `stats.write` on a BT in their sector to a BT leader.
- That sector leader cannot grant `grant` unless they have `grant-grant`.
- Revoking a policy removes the corresponding row and the affected user immediately loses the ability.

---

## Open questions for supervisor

These don't block Phase 0–5, but should be answered before Phase 6+:

- **Past weekly reports:** can BT leaders edit reports from previous weeks, or only the current week? (Affects whether we add a date-based check inside `can()` or a separate column-level rule.)
- **Finance readers:** who exactly can read finance data? Becomes a `finance.read` permission scoped to specific principals.
- **Named roles in the UI:** do we expose "Sector Leader" / "BT Leader" as user-facing role names that translate into permission bundles? Data model stays the same; this is a UX layer.

---

## Notes & design decisions

- **No deny rules.** Permissions are purely additive. If a deny concept ever becomes necessary, it can be added as an explicit table — but the current design intentionally avoids it.
- **"Lower nodes have less privilege" is mostly structural, partly convention.** Subtree containment is real in both trees: a policy on a leaf BT only affects that BT; a policy attached directly to a user principal only affects that user. But nothing in the system prevents misuse like granting `stats.delete` on the Church root to a single user. The grant rules ensure only someone with that power could do it; they don't second-guess the choice.
- **No expiration on policies.** Could add `expires_at` later without breaking the model.
- **Audit trail** lives in `policies.granted_by` + `granted_at`. If richer auditing is needed (changes, revocations, who-tried-what), add a `policy_events` table.
- **Revocation** is just `delete from policies where id = ...`, gated by a `revoke_permission` RPC (Phase 8).
- **Performance:** `can()` is called once per RLS-evaluated row. Fine at current scale. If the policy or report tables ever get large, look at materialising effective permissions per user or caching the ancestor chain.

---

## Checklist

- [x] Phase 0 — Foundation
- [x] Phase 1 — Resources and principals
- [x] Phase 2 — Policies and `can()`
- [x] Phase 3 — Grant logic
- [ ] Phase 4 — Flutter connects to Supabase
- [ ] Phase 5 — Permission cache on the client
- [ ] Phase 6 — Stats domain schema
- [ ] Phase 7 — Stats screen
- [ ] Phase 8 — Grant UI
