-- =============================================================
-- EURO AI — Supabase schema
-- Multi-tenant AI Governance Platform
-- Run in the Supabase SQL Editor (or via supabase CLI).
-- =============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- auth.users (built-in Supabase table, no creation needed)
-- We extend it via profiles table below
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- User Profiles
-- Links Supabase auth users to EURO AI user records
-- ---------------------------------------------------------------
create table if not exists public.profiles (
    id                uuid        primary key references auth.users(id) on delete cascade,
    email             text        not null,
    first_name        text,
    last_name         text,
    current_workspace_id uuid,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------
-- Workspaces (organizations)
-- Multi-tenant isolation boundary. Each company has one workspace.
-- ---------------------------------------------------------------
create table if not exists public.workspaces (
    id                uuid        primary key default gen_random_uuid(),
    slug              text        not null unique,
    name              text        not null,
    description       text,
    owner_id          uuid        not null references auth.users(id) on delete cascade,
    status            text        not null default 'active', -- active, suspended, deleted
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);
create index if not exists workspaces_slug_idx on public.workspaces (slug);

-- ---------------------------------------------------------------
-- Workspace Members
-- Role-based access control within a workspace
-- ---------------------------------------------------------------
create table if not exists public.workspace_members (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    user_id           uuid        not null references auth.users(id) on delete cascade,
    role              text        not null, -- owner, admin, member, viewer
    email             text        not null,
    invited_at        timestamptz not null default now(),
    joined_at         timestamptz,
    status            text        not null default 'pending', -- pending, active, removed
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(workspace_id, user_id)
);

create index if not exists workspace_members_workspace_idx on public.workspace_members (workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------
-- Companies
-- The organization being assessed for AI governance compliance
-- ---------------------------------------------------------------
create table if not exists public.companies (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    name              text        not null,
    legal_name        text,
    country           text,
    industry          text,
    employees         integer,
    website           text,
    status            text        not null default 'active',
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists companies_workspace_idx on public.companies (workspace_id);

-- ---------------------------------------------------------------
-- AI Systems Inventory
-- Tracks all AI systems in use at the company
-- ---------------------------------------------------------------
create table if not exists public.ai_systems (
    id                uuid        primary key default gen_random_uuid(),
    company_id        uuid        not null references public.companies(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    name              text        not null,
    description       text,
    system_type       text, -- large_language_model, generative_ai, classification_system, etc.
    vendor            text,
    purpose           text,
    data_categories   text[], -- personal_data, financial_data, health_data, etc.
    status            text        not null default 'active', -- active, pilot, deprecated
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists ai_systems_company_idx on public.ai_systems (company_id);
create index if not exists ai_systems_workspace_idx on public.ai_systems (workspace_id);

-- ---------------------------------------------------------------
-- Risk Assessments
-- AI Act compliance assessment for each AI system
-- ---------------------------------------------------------------
create table if not exists public.risk_assessments (
    id                uuid        primary key default gen_random_uuid(),
    ai_system_id      uuid        not null references public.ai_systems(id) on delete cascade,
    company_id        uuid        not null references public.companies(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    risk_level        text        not null, -- unacceptable, high, medium, low
    risk_score        float,
    assessment_data   jsonb       not null default '{}'::jsonb,
    status            text        not null default 'draft', -- draft, in_review, finalized
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists risk_assessments_ai_system_idx on public.risk_assessments (ai_system_id);
create index if not exists risk_assessments_company_idx on public.risk_assessments (company_id);

-- ---------------------------------------------------------------
-- Obligations
-- EU AI Act compliance obligations identified for the company
-- ---------------------------------------------------------------
create table if not exists public.obligations (
    id                uuid        primary key default gen_random_uuid(),
    company_id        uuid        not null references public.companies(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    title             text        not null,
    description       text,
    source            text, -- EU_AI_ACT, GDPR, LOCAL_REGULATION, etc.
    status            text        not null default 'identified', -- identified, in_progress, completed, not_applicable
    priority          text, -- critical, high, medium, low
    due_date          date,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists obligations_company_idx on public.obligations (company_id);
create index if not exists obligations_status_idx on public.obligations (status);

-- ---------------------------------------------------------------
-- Evidence
-- Documentation and artifacts supporting compliance
-- ---------------------------------------------------------------
create table if not exists public.evidence (
    id                uuid        primary key default gen_random_uuid(),
    company_id        uuid        not null references public.companies(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    obligation_id     uuid        references public.obligations(id) on delete set null,
    title             text        not null,
    description       text,
    file_url          text,
    file_type         text,
    file_size         integer,
    uploaded_by       uuid        references auth.users(id),
    status            text        not null default 'submitted', -- submitted, under_review, approved, rejected
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists evidence_company_idx on public.evidence (company_id);
create index if not exists evidence_obligation_idx on public.evidence (obligation_id);

-- ---------------------------------------------------------------
-- Remediation Plans
-- Action plans to address identified gaps
-- ---------------------------------------------------------------
create table if not exists public.remediation_plans (
    id                uuid        primary key default gen_random_uuid(),
    company_id        uuid        not null references public.companies(id) on delete cascade,
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    obligation_id     uuid        references public.obligations(id) on delete set null,
    title             text        not null,
    description       text,
    action_items      jsonb       not null default '[]'::jsonb,
    owner             text,
    status            text        not null default 'planned', -- planned, in_progress, completed, on_hold
    target_date       date,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists remediation_plans_company_idx on public.remediation_plans (company_id);
create index if not exists remediation_plans_status_idx on public.remediation_plans (status);

-- ---------------------------------------------------------------
-- Row Level Security
-- Default: deny all. Grant specific access based on workspace membership.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.ai_systems enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.obligations enable row level security;
alter table public.evidence enable row level security;
alter table public.remediation_plans enable row level security;

-- Allow users to read their own profile
create policy "Users can read their own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- Allow authenticated users to create workspaces
create policy "Authenticated users can create workspaces"
    on public.workspaces for insert
    with check (auth.uid() = owner_id);

-- Allow workspace members to read their workspace
create policy "Workspace members can read their workspace"
    on public.workspaces for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = workspaces.id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Allow workspace members to read companies in their workspace
create policy "Members can read workspace companies"
    on public.companies for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = companies.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Similar RLS policies for ai_systems, risk_assessments, obligations, evidence, remediation_plans
-- Follow same pattern: check if user is an active member of the workspace
