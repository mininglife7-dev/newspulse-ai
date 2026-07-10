-- =============================================================================
-- Migration 0002 — Authentication & per-customer data isolation
-- Run in the Supabase SQL Editor AFTER 0001 (the original schema).
--
-- What this does, in plain terms:
--   * Ties every saved search to the customer who ran it (`user_id`).
--   * Removes the old public/anonymous read+insert access to the table.
--   * Turns on database-level rules (RLS) so a signed-in customer can only
--     ever see or change their OWN searches — enforced by the database, not
--     just the application.
--
-- Application code ALSO filters every query by user_id, so isolation holds even
-- before this runs; this migration adds the second, database-level guarantee.
-- =============================================================================

-- 1) Add the owner column (nullable so existing rows don't break the migration).
alter table public.news_searches
    add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists news_searches_user_id_idx
    on public.news_searches (user_id);

-- Composite index for the common "my history, newest first" query.
create index if not exists news_searches_user_created_idx
    on public.news_searches (user_id, created_at desc);

-- 2) Remove the permissive anonymous policies from the original schema.
drop policy if exists "Allow anon read access" on public.news_searches;
drop policy if exists "Allow anon insert"      on public.news_searches;

-- 3) Ensure RLS is on (deny-by-default once the anon policies are gone).
alter table public.news_searches enable row level security;

-- 4) Owner-only policies for authenticated customers.
drop policy if exists "Users read own searches"   on public.news_searches;
drop policy if exists "Users insert own searches"  on public.news_searches;
drop policy if exists "Users update own searches"  on public.news_searches;
drop policy if exists "Users delete own searches"  on public.news_searches;

create policy "Users read own searches"
    on public.news_searches for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users insert own searches"
    on public.news_searches for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users update own searches"
    on public.news_searches for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users delete own searches"
    on public.news_searches for delete
    to authenticated
    using (auth.uid() = user_id);

-- 5) The server uses the service-role key, which bypasses RLS; application code
--    scopes every query by user_id regardless. Anonymous demo searches are
--    never persisted, so no orphaned public rows are created going forward.

-- ---------------------------------------------------------------------------
-- NOTE on legacy rows: any pre-auth rows have user_id = NULL and are therefore
-- invisible to every customer under these policies. Decide per business need:
--   * leave them (inert, invisible), or
--   * delete them:   delete from public.news_searches where user_id is null;
-- Do NOT assign them to an arbitrary user.
-- ---------------------------------------------------------------------------
