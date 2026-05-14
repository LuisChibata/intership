# Database tests

pgTAP-based test suite for the access-control schema. Every phase of
`docs/access-control-implementation.md` has a matching file in
`database/` that pins both the schema shape it introduces and the
behaviour it promises.

## Running

### Local stack (the canonical way)

```bash
supabase start          # boots Postgres + applies migrations + loads seed.sql
supabase test db        # runs every *.sql file in supabase/tests/database/
```

`supabase test db` wraps each file in its own transaction and rolls
back at the end — tests never leave state behind, so the order they
run in doesn't matter.

### Against a remote database (CD-ready, when we wire CI)

```bash
supabase db push                       # ensure remote is up to date
psql "$DATABASE_URL" -f supabase/tests/database/phase0_foundation_test.sql
psql "$DATABASE_URL" -f supabase/tests/database/phase1_resources_principals_test.sql
psql "$DATABASE_URL" -f supabase/tests/database/phase2_policies_and_can_test.sql
psql "$DATABASE_URL" -f supabase/tests/database/phase3_grant_logic_test.sql
```

Each file is self-contained (its own `begin/plan/finish/rollback`) so
they can be run individually or piped through `pg_prove` for nicer
output.

## Layout

```
supabase/tests/database/
├── phase0_foundation_test.sql            # pgcrypto, schemas
├── phase1_resources_principals_test.sql  # schema shape + seed tree invariants
├── phase2_policies_and_can_test.sql      # policies table + can() truth table
└── phase3_grant_logic_test.sql           # grant logic + RLS (TDD)
```

## Conventions

- **Final-state assertions.** Tests describe the database as it should
  be *after every migration in `supabase/migrations/` has applied*.
  A test failing against the current remote is a signal that a
  migration is missing, not that the test is wrong.

- **Behaviour over names where it matters.** The Phase 2 test deliberately
  avoids hardcoding the enum name (`permission` vs `app_permission`)
  because Phase 3's rename would otherwise break it. Naming is the
  Phase 3 test's job. Schema/structure asserts (table names, column
  names, function names) still hardcode the canonical final name.

- **One transaction per file.** Tests that mutate state (Phase 3's
  `grant_permission` calls, the elevated `grant-grant` insert) rely on
  the surrounding `begin; ... rollback;` to clean up. Don't refactor
  this into a single mega-transaction across files.

- **Identity switching.** Phase 3 uses
  ```sql
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub":"<uuid>","role":"authenticated"}';
  ```
  to act as a specific user. `auth.uid()` reads `request.jwt.claims`,
  so the same pattern works for any RLS-sensitive test in later phases.
  Reset with `reset role; reset "request.jwt.claims";` before assertions
  that need elevated privileges (e.g. seeding extra state).

## TDD workflow

1. Write the test file that describes the desired post-phase state.
2. Run it — it should fail (function doesn't exist / table doesn't
   have RLS / etc.).
3. Write the migration that makes the tests pass.
4. Apply the migration.
5. Re-run the tests — they should now pass.
6. Commit migration + test together.

The Phase 3 test file was written under this loop: it currently fails
against the remote (which has only Phases 0–2 applied). Applying
`20260514120000_grant_logic_and_rls.sql` is what turns it green.

## Future: CI

When CI is wired (Phase 4+), the pipeline step should be:

```bash
supabase db reset   # fresh db, all migrations + seed
supabase test db    # run the whole suite
```

A non-zero exit code from `supabase test db` fails the build.
