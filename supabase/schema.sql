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
-- The Next.js server uses the service-role key, which bypasses RLS,
-- so we keep RLS enabled but allow the anon role read-only access
-- for client-side fetches if you ever want them.
-- ---------------------------------------------------------------
alter table public.news_searches enable row level security;

-- Drop existing policies if re-running this script
drop policy if exists "Allow anon read access" on public.news_searches;
drop policy if exists "Allow anon insert"      on public.news_searches;

create policy "Allow anon read access"
    on public.news_searches
    for select
    to anon
    using (true);

-- Allow client-side inserts as well (optional). Comment out if you
-- want all writes to go through the service-role key on the server.
create policy "Allow anon insert"
    on public.news_searches
    for insert
    to anon
    with check (true);

-- ---------------------------------------------------------------
-- Convenience view: most recent searches first
-- ---------------------------------------------------------------
create or replace view public.news_searches_recent as
    select id, keyword, result_count, created_at
    from public.news_searches
    order by created_at desc
    limit 100;

grant select on public.news_searches_recent to anon, authenticated;

-- ---------------------------------------------------------------
-- audit_log
-- Append-only trail of sensitive/destructive actions (e.g. clearing or
-- deleting saved searches). Written server-side via the service-role key,
-- which bypasses RLS. RLS is enabled with NO anon policies, so the anon key
-- cannot read or write the audit trail.
-- ---------------------------------------------------------------
create table if not exists public.audit_log (
    id          uuid        primary key default gen_random_uuid(),
    action      text        not null,
    detail      jsonb       not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx
    on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
-- Intentionally no policies: server (service role) only.
