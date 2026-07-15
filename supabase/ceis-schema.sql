-- =============================================================
-- Cathedral Evolution Intelligence System (CEIS) — Supabase schema
-- Run in the Supabase SQL Editor after supabase/schema.sql.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- ceis_observations
-- Raw public-knowledge signals gathered by research collectors.
-- Only metadata + short excerpts are stored — never scraped bodies.
-- ---------------------------------------------------------------
create table if not exists public.ceis_observations (
    id            text        primary key,          -- stable content hash
    collector     text        not null,
    category      text        not null,
    title         text        not null,
    url           text        not null,
    source        text        not null,
    observed_at   timestamptz not null,
    published_at  timestamptz,
    evidence      text        not null default '',
    confidence    real        not null default 0.5,
    created_at    timestamptz not null default now()
);

create index if not exists ceis_observations_observed_at_idx
    on public.ceis_observations (observed_at desc);
create index if not exists ceis_observations_category_idx
    on public.ceis_observations (category);

-- ---------------------------------------------------------------
-- ceis_principles
-- Extracted reusable principles (full JSON in `data`).
-- ---------------------------------------------------------------
create table if not exists public.ceis_principles (
    id            text        primary key,
    data          jsonb       not null,
    created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- ceis_dna_proposals
-- Generated DNA missions. `status` is the authoritative review state
-- (proposed | under-review | approved | rejected); `data` holds the
-- full mission document including quality gates.
-- ---------------------------------------------------------------
create table if not exists public.ceis_dna_proposals (
    id            text        primary key,
    code          text        not null,
    status        text        not null default 'proposed'
                  check (status in ('proposed', 'under-review', 'approved', 'rejected')),
    data          jsonb       not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists ceis_dna_proposals_status_idx
    on public.ceis_dna_proposals (status, created_at desc);

-- ---------------------------------------------------------------
-- ceis_genome
-- The Cathedral's permanent memory: lessons, decisions, rejected and
-- successful ideas, customer insights, evaluations. Seed capabilities
-- live in code (lib/ceis/genome.ts); this table holds what is learned.
-- ---------------------------------------------------------------
create table if not exists public.ceis_genome (
    id            text        primary key,
    kind          text        not null
                  check (kind in (
                      'capability', 'lesson', 'architecture-decision',
                      'rejected-idea', 'successful-idea', 'customer-insight',
                      'implementation-result', 'performance-improvement',
                      'technology-evaluation')),
    title         text        not null,
    summary       text        not null default '',
    tags          jsonb       not null default '[]'::jsonb,
    evidence      text,
    created_at    timestamptz not null default now()
);

create index if not exists ceis_genome_kind_idx
    on public.ceis_genome (kind, created_at desc);

-- ---------------------------------------------------------------
-- ceis_reports
-- Weekly evolution reports (markdown + stats).
-- ---------------------------------------------------------------
create table if not exists public.ceis_reports (
    id                       text        primary key,
    week                     text        not null,
    generated_at             timestamptz not null,
    markdown                 text        not null,
    stats                    jsonb       not null default '{}'::jsonb,
    overall_evolution_score  integer     not null default 0,
    created_at               timestamptz not null default now()
);

create index if not exists ceis_reports_generated_at_idx
    on public.ceis_reports (generated_at desc);

-- ---------------------------------------------------------------
-- Row Level Security — server-only tables. The Next.js server uses the
-- service-role key (bypasses RLS); no anon policies are created, so the
-- anon key cannot read or write CEIS data.
-- ---------------------------------------------------------------
alter table public.ceis_observations  enable row level security;
alter table public.ceis_principles    enable row level security;
alter table public.ceis_dna_proposals enable row level security;
alter table public.ceis_genome        enable row level security;
alter table public.ceis_reports       enable row level security;
