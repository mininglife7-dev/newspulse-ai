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
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------
-- Profile Auto-Creation Trigger
-- Creates a profile row automatically when a user signs up via auth.users
-- Runs with elevated privileges (service_role context in Supabase)
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
  );
  return new;
exception when others then
  -- Fail hard: prevent signup if profile creation fails to ensure data consistency
  raise exception 'Failed to create user profile: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists (idempotent)
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
    employees_range   text,        -- e.g. '1-10', '11-50', '51-200'
    website           text,
    governance_priorities text,
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

-- Allow users to create and update their own profile
create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Owners can always read their own workspaces (needed for the INSERT ...
-- RETURNING during onboarding, before the membership row exists)
create policy "Owners can read their own workspaces"
    on public.workspaces for select
    using (auth.uid() = owner_id);

-- Users can read their own membership rows
create policy "Users can read their own memberships"
    on public.workspace_members for select
    using (user_id = auth.uid());

-- A workspace owner can add themselves as a member (onboarding step 2)
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

-- Active members can create companies in their workspace
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

-- AI systems: active workspace members can read and create
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

create policy "Members can update workspace ai_systems"
    on public.ai_systems for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_systems.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Risk assessments: members can read and create
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

create policy "Members can update workspace risk_assessments"
    on public.risk_assessments for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = risk_assessments.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Obligations: members can read, create, and update
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

create policy "Members can update workspace obligations"
    on public.obligations for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = obligations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Evidence: members can read, create, and update
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

create policy "Members can update workspace evidence"
    on public.evidence for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = evidence.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- Remediation plans: members can read, create, and update
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

create policy "Members can update workspace remediation_plans"
    on public.remediation_plans for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediation_plans.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- ---------------------------------------------------------------
-- Discovery Connections
-- OAuth/API credentials for integrations (GitHub, AWS, Azure, GCP)
-- ---------------------------------------------------------------
create table if not exists public.discovery_connections (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    provider          text        not null, -- github, aws, azure, gcp
    connection_name   text        not null,
    config            jsonb       not null default '{}'::jsonb, -- encrypted token, org/username, etc.
    status            text        not null default 'active', -- active, inactive, error
    last_tested_at    timestamptz,
    last_sync_at      timestamptz,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists discovery_connections_workspace_idx on public.discovery_connections (workspace_id);
create index if not exists discovery_connections_provider_idx on public.discovery_connections (provider);

-- ---------------------------------------------------------------
-- AI System Detections
-- Auto-discovered AI systems from GitHub, AWS, Azure, GCP
-- ---------------------------------------------------------------
create table if not exists public.ai_system_detections (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    company_id        uuid        references public.companies(id) on delete set null,
    ai_system_id      uuid        references public.ai_systems(id) on delete set null,
    detection_source  text        not null, -- github, aws, azure, gcp, manual
    external_id       text        not null, -- GitHub repo ID, AWS ARN, etc.
    name              text        not null,
    description       text,
    url               text,
    language          text,
    topics            text[],
    detected_patterns text[],
    confidence        float       not null, -- 0-100 confidence score
    metadata          jsonb       not null default '{}'::jsonb,
    status            text        not null default 'detected', -- detected, approved, rejected, imported
    imported_at       timestamptz,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique(workspace_id, detection_source, external_id)
);

create index if not exists ai_system_detections_workspace_idx on public.ai_system_detections (workspace_id);
create index if not exists ai_system_detections_status_idx on public.ai_system_detections (status);
create index if not exists ai_system_detections_confidence_idx on public.ai_system_detections (confidence);

-- ---------------------------------------------------------------
-- RLS for discovery_connections
-- ---------------------------------------------------------------
alter table public.discovery_connections enable row level security;

create policy "Members can read workspace discovery_connections"
    on public.discovery_connections for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = discovery_connections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can insert workspace discovery_connections"
    on public.discovery_connections for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = discovery_connections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can update workspace discovery_connections"
    on public.discovery_connections for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = discovery_connections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- ---------------------------------------------------------------
-- RLS for ai_system_detections
-- ---------------------------------------------------------------
alter table public.ai_system_detections enable row level security;

create policy "Members can read workspace ai_system_detections"
    on public.ai_system_detections for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_system_detections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can insert workspace ai_system_detections"
    on public.ai_system_detections for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_system_detections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can update workspace ai_system_detections"
    on public.ai_system_detections for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = ai_system_detections.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- ---------------------------------------------------------------
-- Runtime Monitoring Alerts
-- Stores threat detection results from runtime event processing
-- ---------------------------------------------------------------
create table if not exists public.monitoring_alerts (
    id              text        primary key,
    workspace_id    uuid        not null references public.workspaces(id) on delete cascade,
    system_id       text        not null,
    alert_type      text        not null,
    severity        text        not null,
    confidence      numeric     not null,
    message         text        not null,
    details         jsonb       default '{}',
    metadata        jsonb       default '{}',
    timestamp       timestamptz not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists monitoring_alerts_workspace_idx on public.monitoring_alerts (workspace_id);
create index if not exists monitoring_alerts_system_id_idx on public.monitoring_alerts (system_id);
create index if not exists monitoring_alerts_severity_idx on public.monitoring_alerts (severity);
create index if not exists monitoring_alerts_alert_type_idx on public.monitoring_alerts (alert_type);
create index if not exists monitoring_alerts_timestamp_idx on public.monitoring_alerts (timestamp);

-- ---------------------------------------------------------------
-- RLS for monitoring_alerts
-- ---------------------------------------------------------------
alter table public.monitoring_alerts enable row level security;

create policy "Members can read workspace monitoring_alerts"
    on public.monitoring_alerts for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = monitoring_alerts.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can insert workspace monitoring_alerts"
    on public.monitoring_alerts for insert
    with check (
        exists (
            select 1 from public.workspace_members
            where workspace_id = monitoring_alerts.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

create policy "Members can update workspace monitoring_alerts"
    on public.monitoring_alerts for update
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = monitoring_alerts.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- ---------------------------------------------------------------
-- Atomic Workspace Creation RPC
-- Creates workspace, membership, and company in a single transaction
-- Rolls back all inserts if any step fails
-- ---------------------------------------------------------------
create or replace function public.create_workspace_atomic(
    p_slug text,
    p_name text,
    p_description text,
    p_owner_id uuid,
    p_legal_name text DEFAULT NULL,
    p_country text DEFAULT NULL,
    p_industry text DEFAULT NULL,
    p_employees_range text DEFAULT NULL,
    p_website text DEFAULT NULL,
    p_governance_priorities text DEFAULT NULL
)
returns json as $$
declare
    v_workspace_id uuid;
    v_company_id uuid;
begin
    -- Step 1: Insert workspace
    insert into public.workspaces (slug, name, description, owner_id, status)
    values (p_slug, p_name, p_description, p_owner_id, 'active')
    returning id into v_workspace_id;

    -- Step 2: Insert workspace membership (owner)
    insert into public.workspace_members (workspace_id, user_id, role, email, status, joined_at)
    values (
        v_workspace_id,
        p_owner_id,
        'owner',
        (select email from auth.users where id = p_owner_id),
        'active',
        now()
    );

    -- Step 3: Insert company profile
    insert into public.companies (
        workspace_id,
        name,
        legal_name,
        country,
        industry,
        employees_range,
        website,
        governance_priorities
    )
    values (
        v_workspace_id,
        p_name,
        p_legal_name,
        p_country,
        p_industry,
        p_employees_range,
        p_website,
        p_governance_priorities
    )
    returning id into v_company_id;

    -- Success: return both IDs
    return json_build_object(
        'workspace_id', v_workspace_id,
        'company_id', v_company_id,
        'success', true
    );
exception when others then
    -- Transaction automatically rolls back on any error
    return json_build_object(
        'success', false,
        'error', sqlerrm
    );
end;
$$ language plpgsql security definer;
