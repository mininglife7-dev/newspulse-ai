-- =============================================================
-- NewsPulse AI — Supabase schema (canonical, for a FRESH project)
-- Run in the Supabase SQL Editor (or via supabase CLI).
--
-- For an EXISTING database created from the earlier version of this file,
-- run supabase/migrations/0002_auth_user_isolation.sql instead of re-running
-- this whole script.
-- =============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- news_searches
-- One row per search a customer runs. The full result list (with AI
-- summaries) is stored in `results` as JSONB so we can replay the exact
-- same view on the /history page. Every row is owned by the customer
-- who ran it (`user_id`).
-- ---------------------------------------------------------------
create table if not exists public.news_searches (
    id            uuid        primary key default gen_random_uuid(),
    user_id       uuid        references auth.users (id) on delete cascade,
    keyword       text        not null,
    results       jsonb       not null default '[]'::jsonb,
    result_count  integer     not null default 0,
    created_at    timestamptz not null default now()
);

-- Helpful indexes
create index if not exists news_searches_created_at_idx
    on public.news_searches (created_at desc);

create index if not exists news_searches_keyword_idx
    on public.news_searches (lower(keyword));

create index if not exists news_searches_user_id_idx
    on public.news_searches (user_id);

-- Composite index for the common "my history, newest first" query.
create index if not exists news_searches_user_created_idx
    on public.news_searches (user_id, created_at desc);

-- ---------------------------------------------------------------
-- Row Level Security — owner-only access.
-- The Next.js server uses the service-role key (bypasses RLS) AND scopes
-- every query by user_id in application code. These policies add a second,
-- database-level guarantee so a signed-in customer can only ever touch
-- their OWN rows. There is deliberately NO anonymous access.
-- ---------------------------------------------------------------
alter table public.news_searches enable row level security;

-- Drop any legacy/anon policies if re-running.
drop policy if exists "Allow anon read access"    on public.news_searches;
drop policy if exists "Allow anon insert"         on public.news_searches;
drop policy if exists "Users read own searches"   on public.news_searches;
drop policy if exists "Users insert own searches" on public.news_searches;
drop policy if exists "Users update own searches" on public.news_searches;
drop policy if exists "Users delete own searches" on public.news_searches;

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
