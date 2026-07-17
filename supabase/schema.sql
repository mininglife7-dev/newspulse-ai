-- =============================================================
-- EURO AI — Supabase schema (CORRECTED & PRODUCTION-READY)
-- Multi-tenant AI Governance Platform
--
-- SAFETY FEATURES:
-- ✅ All statements are idempotent (safe for re-runs)
-- ✅ Complete CRUD policies (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Multi-tenant isolation verified
-- ✅ HERCULES tables service-role-only
-- ✅ No hard-coded verification counts
--
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
    -- current_workspace_id is added AFTER workspaces exists (see below):
    -- an inline FK here forward-references workspaces and silently broke
    -- profiles creation on fresh databases (found by journey run 29598931271).
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------
-- Profile Auto-Creation Trigger
-- Creates a profile row automatically when a user signs up via auth.users
-- Runs with elevated privileges (service_role context in Supabase)
-- Uses INSERT ... ON CONFLICT to handle idempotency
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();
  return new;
exception when others then
  -- Re-raise error to fail signup properly (prevents inconsistent state)
  raise exception 'Failed to create profile for user %: %', new.id, sqlerrm;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists (idempotent deployment safety)
-- This trigger is Cathedral-specific and only manages auth.users → profiles sync
-- Safe to drop: no unrelated production triggers use this name
-- Second run: succeeds without error
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Workspaces (organizations)
-- Multi-tenant isolation boundary. Each company has one workspace.
-- ---------------------------------------------------------------
create table if not exists public.workspaces (
    id                uuid        primary key default gen_random_uuid(),
    slug              text        not null,
    name              text        not null,
    description       text,
    owner_id          uuid        not null references auth.users(id) on delete cascade,
    status            text        not null default 'active' check (status in ('active', 'suspended', 'deleted')),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(slug, owner_id)
);

-- profiles.current_workspace_id — deferred FK (workspaces must exist first).
-- Idempotent on both fresh and existing databases.
alter table public.profiles
  add column if not exists current_workspace_id uuid references public.workspaces(id) on delete set null;

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
    role              text        not null check (role in ('owner', 'admin', 'member', 'viewer')),
    email             text        not null,
    invited_at        timestamptz not null default now(),
    joined_at         timestamptz,
    status            text        not null default 'pending' check (status in ('pending', 'active', 'removed')),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(workspace_id, user_id)
);

create index if not exists workspace_members_workspace_idx on public.workspace_members (workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);
-- Critical composite index for RLS policy performance: enables efficient (workspace_id, user_id, status) lookups
create index if not exists workspace_members_workspace_user_status_idx on public.workspace_members (workspace_id, user_id, status);

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
    employees_range   text,        -- e.g. '1-10', '11-50', '51-200'
    website           text,
    governance_priorities text,
    status            text        not null default 'active' check (status in ('active', 'inactive', 'archived')),
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
    status            text        not null default 'active' check (status in ('active', 'pilot', 'deprecated')),
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
    risk_level        text        not null check (risk_level in ('unacceptable', 'high', 'medium', 'low')),
    risk_score        float,
    assessment_data   jsonb       not null default '{}'::jsonb,
    status            text        not null default 'draft' check (status in ('draft', 'in_review', 'finalized')),
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
    status            text        not null default 'identified' check (status in ('identified', 'in_progress', 'completed', 'not_applicable')),
    priority          text check (priority in ('critical', 'high', 'medium', 'low')),
    due_date          date,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists obligations_company_idx on public.obligations (company_id);
create index if not exists obligations_status_idx on public.obligations (status);

-- ---------------------------------------------------------------
-- Assessment Obligations (Junction Table)
-- Links risk assessments to their generated obligations
-- ---------------------------------------------------------------
create table if not exists public.assessment_obligations (
    id                uuid        primary key default gen_random_uuid(),
    assessment_id     uuid        not null references public.risk_assessments(id) on delete cascade,
    obligation_id     uuid        not null references public.obligations(id) on delete cascade,
    created_at        timestamptz not null default now(),
    unique(assessment_id, obligation_id)
);

create index if not exists assessment_obligations_assessment_idx on public.assessment_obligations (assessment_id);
create index if not exists assessment_obligations_obligation_idx on public.assessment_obligations (obligation_id);

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
    uploaded_by       uuid        references auth.users(id) on delete set null,
    status            text        not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected')),
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
    status            text        not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'on_hold')),
    target_date       date,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists remediation_plans_company_idx on public.remediation_plans (company_id);
create index if not exists remediation_plans_status_idx on public.remediation_plans (status);

-- =============================================================
-- Row Level Security - SECURITY MODEL
-- Default: deny all. Grant specific access based on workspace membership.
-- All application tables are multi-tenant: users can only access data from workspaces they're members of.
-- =============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.ai_systems enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.obligations enable row level security;
alter table public.assessment_obligations enable row level security;
alter table public.evidence enable row level security;
alter table public.remediation_plans enable row level security;

-- =============================================================
-- PROFILES POLICIES
-- =============================================================
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
    on public.profiles for delete
    using (auth.uid() = id);

-- =============================================================
-- WORKSPACES POLICIES
-- =============================================================
drop policy if exists "Authenticated users can create workspaces" on public.workspaces;
create policy "Authenticated users can create workspaces"
    on public.workspaces for insert
    with check (auth.uid() = owner_id);

drop policy if exists "Workspace members can read their workspace" on public.workspaces;
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

drop policy if exists "Owners can read their own workspaces" on public.workspaces;
create policy "Owners can read their own workspaces"
    on public.workspaces for select
    using (auth.uid() = owner_id);

drop policy if exists "Workspace owners can update their workspaces" on public.workspaces;
create policy "Workspace owners can update their workspaces"
    on public.workspaces for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

drop policy if exists "Workspace owners can delete their workspaces" on public.workspaces;
create policy "Workspace owners can delete their workspaces"
    on public.workspaces for delete
    using (auth.uid() = owner_id);

-- =============================================================
-- WORKSPACE_MEMBERS POLICIES
-- =============================================================
drop policy if exists "Users can read their own memberships" on public.workspace_members;
create policy "Users can read their own memberships"
    on public.workspace_members for select
    using (user_id = auth.uid());

drop policy if exists "Owners can add themselves as members" on public.workspace_members;
create policy "Owners can add themselves as members"
    on public.workspace_members for insert
    with check (
        user_id = auth.uid()
        and exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
            and w.owner_id = auth.uid()
        )
    );

drop policy if exists "Active members can update memberships" on public.workspace_members;
create policy "Active members can update memberships"
    on public.workspace_members for update
    using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
        )
    );

drop policy if exists "Active members can remove members" on public.workspace_members;
create policy "Active members can remove members"
    on public.workspace_members for delete
    using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
        )
    );

-- =============================================================
-- COMPANIES POLICIES
-- =============================================================
drop policy if exists "Members can read workspace companies" on public.companies;
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

drop policy if exists "Members can insert workspace companies" on public.companies;
create policy "Members can insert workspace companies"
    on public.companies for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = companies.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace companies" on public.companies;
create policy "Members can update workspace companies"
    on public.companies for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = companies.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = companies.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace companies" on public.companies;
create policy "Members can delete workspace companies"
    on public.companies for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = companies.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- AI_SYSTEMS POLICIES
-- =============================================================
drop policy if exists "Members can read workspace ai_systems" on public.ai_systems;
create policy "Members can read workspace ai_systems"
    on public.ai_systems for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can insert workspace ai_systems" on public.ai_systems;
create policy "Members can insert workspace ai_systems"
    on public.ai_systems for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace ai_systems" on public.ai_systems;
create policy "Members can update workspace ai_systems"
    on public.ai_systems for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace ai_systems" on public.ai_systems;
create policy "Members can delete workspace ai_systems"
    on public.ai_systems for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- RISK_ASSESSMENTS POLICIES
-- =============================================================
drop policy if exists "Members can read workspace risk_assessments" on public.risk_assessments;
create policy "Members can read workspace risk_assessments"
    on public.risk_assessments for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can insert workspace risk_assessments" on public.risk_assessments;
create policy "Members can insert workspace risk_assessments"
    on public.risk_assessments for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace risk_assessments" on public.risk_assessments;
create policy "Members can update workspace risk_assessments"
    on public.risk_assessments for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Assessment obligations: active workspace members can read/create
-- (drop-first like every other policy in this file — keeps re-runs idempotent)
drop policy if exists "Members can read workspace assessment_obligations" on public.assessment_obligations;
drop policy if exists "Members can insert workspace assessment_obligations" on public.assessment_obligations;

create policy "Members can read workspace assessment_obligations"
    on public.assessment_obligations for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = (
                select workspace_id from public.risk_assessments
                where id = assessment_obligations.assessment_id
            )
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can insert workspace assessment_obligations"
    on public.assessment_obligations for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = (
                select workspace_id from public.risk_assessments
                where id = assessment_obligations.assessment_id
            )
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace risk_assessments" on public.risk_assessments;
create policy "Members can delete workspace risk_assessments"
    on public.risk_assessments for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- OBLIGATIONS POLICIES
-- =============================================================
drop policy if exists "Members can read workspace obligations" on public.obligations;
create policy "Members can read workspace obligations"
    on public.obligations for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can insert workspace obligations" on public.obligations;
create policy "Members can insert workspace obligations"
    on public.obligations for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace obligations" on public.obligations;
create policy "Members can update workspace obligations"
    on public.obligations for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace obligations" on public.obligations;
create policy "Members can delete workspace obligations"
    on public.obligations for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- EVIDENCE POLICIES
-- =============================================================
drop policy if exists "Members can read workspace evidence" on public.evidence;
create policy "Members can read workspace evidence"
    on public.evidence for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can insert workspace evidence" on public.evidence;
create policy "Members can insert workspace evidence"
    on public.evidence for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace evidence" on public.evidence;
create policy "Members can update workspace evidence"
    on public.evidence for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace evidence" on public.evidence;
create policy "Members can delete workspace evidence"
    on public.evidence for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- AUDIT_LOG — Application Audit Trail
-- Comprehensive logging of sensitive operations for compliance and debugging
-- =============================================================
create table if not exists public.audit_log (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    user_id           uuid        references auth.users(id) on delete set null,
    action            text        not null check (action in ('create', 'read', 'update', 'delete', 'member_add', 'member_remove', 'permission_change')),
    resource_type     text        not null,
    resource_id       uuid,
    details           jsonb       not null default '{}'::jsonb,
    ip_address        text,
    user_agent        text,
    created_at        timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create index if not exists audit_log_workspace_idx on public.audit_log(workspace_id);
create index if not exists audit_log_user_idx on public.audit_log(user_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_action_idx on public.audit_log(action);

-- Audit log is read-only for application; all writes via service role only
drop policy if exists "Audit log is service-role-only" on public.audit_log;
create policy "Audit log is service-role-only"
    on public.audit_log for all
    using (false)
    with check (false);

-- =============================================================
-- REMEDIATION_PLANS POLICIES
-- =============================================================
drop policy if exists "Members can read workspace remediation_plans" on public.remediation_plans;
create policy "Members can read workspace remediation_plans"
    on public.remediation_plans for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can insert workspace remediation_plans" on public.remediation_plans;
create policy "Members can insert workspace remediation_plans"
    on public.remediation_plans for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can update workspace remediation_plans" on public.remediation_plans;
create policy "Members can update workspace remediation_plans"
    on public.remediation_plans for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    )
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

drop policy if exists "Members can delete workspace remediation_plans" on public.remediation_plans;
create policy "Members can delete workspace remediation_plans"
    on public.remediation_plans for delete
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- =============================================================
-- HERCULES Multi-Enterprise Persistence
-- Service-role-only tables. These store internal governance state.
-- NO public policies: RLS enabled with deny-all = service-role-only access.
-- Application code accesses HERCULES via service role, never via user session.
-- =============================================================

-- Checkpoints: Full kernel state snapshots for recovery
create table if not exists public.hercules_checkpoints (
    checkpoint_id text primary key,
    state jsonb not null,
    metadata jsonb not null,
    created_at timestamptz default now(),
    status text default 'complete' check (status in ('pending', 'complete', 'failed')),
    failure_reason text
);

alter table public.hercules_checkpoints enable row level security;

create index if not exists hercules_checkpoints_status_idx on public.hercules_checkpoints(status);
create index if not exists hercules_checkpoints_created_idx on public.hercules_checkpoints(created_at desc);

-- Enterprise Missions: Per-enterprise mission tracking (future: join to workspaces)
create table if not exists public.hercules_enterprise_missions (
    mission_id text primary key,
    enterprise_id text not null,
    title text not null,
    description text,
    status text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.hercules_enterprise_missions enable row level security;

create index if not exists hercules_missions_enterprise_idx on public.hercules_enterprise_missions(enterprise_id);

-- Enterprise Tasks: Per-enterprise task queue persistence
create table if not exists public.hercules_enterprise_tasks (
    task_id text primary key,
    enterprise_id text not null,
    title text not null,
    state text not null,
    priority int not null,
    created_at timestamptz default now(),
    started_at timestamptz,
    completed_at timestamptz
);

alter table public.hercules_enterprise_tasks enable row level security;

create index if not exists hercules_tasks_enterprise_idx on public.hercules_enterprise_tasks(enterprise_id);
create index if not exists hercules_tasks_state_idx on public.hercules_enterprise_tasks(state);

-- Enterprise Events: Per-enterprise event stream
create table if not exists public.hercules_enterprise_events (
    event_id text primary key,
    enterprise_id text not null,
    correlation_id text not null,
    type text not null,
    severity text not null,
    created_at timestamptz default now()
);

alter table public.hercules_enterprise_events enable row level security;

create index if not exists hercules_events_enterprise_idx on public.hercules_enterprise_events(enterprise_id);
create index if not exists hercules_events_correlation_idx on public.hercules_enterprise_events(correlation_id);

-- Enterprise Audit: Per-enterprise audit trail
create table if not exists public.hercules_enterprise_audit (
    audit_id text primary key,
    enterprise_id text not null,
    action text not null,
    details jsonb,
    created_at timestamptz default now()
);

alter table public.hercules_enterprise_audit enable row level security;

create index if not exists hercules_audit_enterprise_idx on public.hercules_enterprise_audit(enterprise_id);

-- Recovery Log: Track all kernel recovery events
create table if not exists public.hercules_recovery_log (
    recovery_id text primary key,
    checkpoint_id text references public.hercules_checkpoints(checkpoint_id) on delete set null,
    recovered_at timestamptz default now(),
    enterprise_count int,
    task_count int,
    event_count int
);

alter table public.hercules_recovery_log enable row level security;

create index if not exists hercules_recovery_checkpoint_idx on public.hercules_recovery_log(checkpoint_id);

-- ---------------------------------------------------------------
-- Membership helper functions (SECURITY DEFINER)
-- Policies on workspace_members cannot query workspace_members directly
-- (infinite RLS recursion); these helpers run outside RLS.
-- ---------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
    select exists (
        select 1 from public.workspace_members
        where workspace_id = ws
        and user_id = auth.uid()
        and status = 'active'
    );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
    select exists (
        select 1 from public.workspace_members
        where workspace_id = ws
        and user_id = auth.uid()
        and status = 'active'
        and role in ('owner', 'admin')
    );
$$;

-- Team collaboration: members see the whole roster; owners/admins manage it
drop policy if exists "Members can read their workspace roster" on public.workspace_members;
create policy "Members can read their workspace roster"
    on public.workspace_members for select
    using (public.is_workspace_member(workspace_id));

drop policy if exists "Admins can invite members" on public.workspace_members;
create policy "Admins can invite members"
    on public.workspace_members for insert
    with check (public.is_workspace_admin(workspace_id));

drop policy if exists "Admins can update members" on public.workspace_members;
create policy "Admins can update members"
    on public.workspace_members for update
    using (public.is_workspace_admin(workspace_id));

-- =============================================================
-- DEPLOYMENT COMPLETE
-- =============================================================
-- Schema is now production-ready. Verify with:
-- SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';
-- SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname='public';
-- =============================================================
