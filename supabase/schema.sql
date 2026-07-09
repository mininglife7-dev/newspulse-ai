-- =============================================================
-- NewsPulse AI — Supabase schema
-- Run in the Supabase SQL Editor (or via supabase CLI).
-- =============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- news_searches
-- One row per search the user runs. The full result list (with
-- AI summaries) is stored in `results` as JSONB so we can replay
-- the exact same view on the /history page.
-- ---------------------------------------------------------------
create table if not exists public.news_searches (
    id            uuid        primary key default gen_random_uuid(),
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

-- ---------------------------------------------------------------
-- Row Level Security
-- All data access goes through the Next.js server using the
-- service-role key, which bypasses RLS. The anon (publishable) key
-- ships to every browser, so an anon policy is effectively public
-- access: anon SELECT exposes the entire search history to anyone,
-- and anon INSERT lets anyone write rows directly to the table.
-- RLS stays enabled with NO anon policies — deny by default.
-- ---------------------------------------------------------------
alter table public.news_searches enable row level security;

-- Drop the permissive policies created by earlier revisions of this
-- script (safe to re-run).
drop policy if exists "Allow anon read access" on public.news_searches;
drop policy if exists "Allow anon insert"      on public.news_searches;

-- ---------------------------------------------------------------
-- Convenience view: most recent searches first
-- Granted to authenticated only — anon exposure would leak the
-- search history to anyone holding the public key.
-- ---------------------------------------------------------------
create or replace view public.news_searches_recent as
    select id, keyword, result_count, created_at
    from public.news_searches
    order by created_at desc
    limit 100;

revoke select on public.news_searches_recent from anon;
grant select on public.news_searches_recent to authenticated;
