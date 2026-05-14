-- Phase 0 — Foundation
--
-- These don't deeply exercise behavior; they confirm the assumptions
-- every later phase rests on:
--   - pgcrypto for crypt() / gen_random_uuid() used by the seed
--   - the auth schema (Supabase Auth)
--   - the public schema
--
-- If this file fails, the whole project is unhealthy and the later
-- phase tests can't be trusted.

begin;
set local search_path = public, extensions;
select plan(3);

select has_extension('pgcrypto', 'pgcrypto installed (crypt() and gen_random_uuid() in seed and migrations)');
select has_schema('auth',        'Supabase auth schema is present');
select has_schema('public',      'public schema is present');

select * from finish();
rollback;
