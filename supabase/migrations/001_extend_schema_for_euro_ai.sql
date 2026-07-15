-- =============================================================
-- EURO AI Schema Extensions
-- Add missing tables and fields for complete compliance workflow
-- =============================================================

-- ---------------------------------------------------------------
-- Extend ai_systems table with additional fields
-- ---------------------------------------------------------------
alter table public.ai_systems
add column if not exists category text default 'other', -- large_language_model, computer_vision, recommendation, autonomous, biometric, other
add column if not exists risk_level text default 'medium', -- low, medium, high
add column if not exists created_by uuid references auth.users(id),
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------
-- Extend evidence table with additional fields
-- ---------------------------------------------------------------
alter table public.evidence
add column if not exists evidence_type text default 'file', -- file, url, note, attestation
add column if not exists external_url text,
add column if not exists content text,
add column if not exists tags text[] default '{}',
add column if not exists created_by uuid references auth.users(id),
add column if not exists ai_system_id uuid references public.ai_systems(id) on delete set null;

-- ---------------------------------------------------------------
-- Remediations Table
-- Track compliance action items linked to obligations
-- ---------------------------------------------------------------
create table if not exists public.remediations (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    obligation_id     uuid        not null references public.obligations(id) on delete cascade,
    title             text        not null,
    description       text,
    assigned_to       uuid        references auth.users(id) on delete set null,
    priority          text        not null default 'medium', -- low, medium, high, critical
    status            text        not null default 'open', -- open, in_progress, completed, blocked
    target_completion_date date,
    completed_date    date,
    created_by        uuid        not null references auth.users(id) on delete cascade,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists remediations_workspace_idx on public.remediations (workspace_id);
create index if not exists remediations_obligation_idx on public.remediations (obligation_id);
create index if not exists remediations_status_idx on public.remediations (status);

-- ---------------------------------------------------------------
-- Audit Logs Table
-- Track all user actions for compliance audits
-- ---------------------------------------------------------------
create table if not exists public.audit_logs (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    user_id           uuid        not null references auth.users(id) on delete cascade,
    event_type        text        not null,
    entity_type       text        not null, -- ai_system, obligation, evidence, remediation, workspace, member
    entity_id         uuid        not null,
    action            text        not null, -- created, updated, deleted, reviewed, approved, rejected
    description       text,
    metadata          jsonb       default '{}',
    created_at        timestamptz not null default now()
);

create index if not exists audit_logs_workspace_idx on public.audit_logs (workspace_id);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

-- ---------------------------------------------------------------
-- Regulatory Updates Table
-- Track regulatory changes by jurisdiction
-- ---------------------------------------------------------------
create table if not exists public.regulatory_updates (
    id                uuid        primary key default gen_random_uuid(),
    title             text        not null,
    description       text,
    jurisdiction      text        not null, -- e.g., EU, US, UK, APAC
    regulation_type   text, -- AI_ACT, GDPR, LOCAL, etc.
    effective_date    date,
    impact_level      text        not null default 'medium', -- low, medium, high, critical
    status            text        not null default 'active', -- active, pending, expired
    source_url        text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists regulatory_updates_jurisdiction_idx on public.regulatory_updates (jurisdiction);
create index if not exists regulatory_updates_status_idx on public.regulatory_updates (status);

-- ---------------------------------------------------------------
-- Regulatory Reviews Table
-- Track which regulatory updates have been reviewed by workspaces
-- ---------------------------------------------------------------
create table if not exists public.regulatory_reviews (
    id                uuid        primary key default gen_random_uuid(),
    workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
    update_id         uuid        not null references public.regulatory_updates(id) on delete cascade,
    reviewed_by       uuid        not null references auth.users(id) on delete cascade,
    notes             text,
    reviewed_at       timestamptz not null default now(),
    created_at        timestamptz not null default now(),
    unique(workspace_id, update_id)
);

create index if not exists regulatory_reviews_workspace_idx on public.regulatory_reviews (workspace_id);
create index if not exists regulatory_reviews_update_idx on public.regulatory_reviews (update_id);

-- ---------------------------------------------------------------
-- Extend obligations table with additional fields
-- ---------------------------------------------------------------
alter table public.obligations
add column if not exists ai_system_id uuid references public.ai_systems(id) on delete set null,
add column if not exists risk_assessment_id uuid references public.risk_assessments(id) on delete set null,
add column if not exists category text default 'compliance', -- compliance, documentation, monitoring, governance, transparency
add column if not exists deadline_days integer,
add column if not exists created_by uuid references auth.users(id);

-- ---------------------------------------------------------------
-- Extend risk_assessments table with assessment flow
-- ---------------------------------------------------------------
alter table public.risk_assessments
add column if not exists assessment_type text default 'general', -- prohibited, high_risk, general
add column if not exists responses jsonb default '[]',
add column if not exists created_by uuid references auth.users(id),
add column if not exists status text not null default 'completed';

-- ---------------------------------------------------------------
-- Row Level Security for new tables
-- ---------------------------------------------------------------
alter table public.remediations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.regulatory_updates enable row level security;
alter table public.regulatory_reviews enable row level security;

-- RLS policies for remediations
create policy "Members can read workspace remediations"
    on public.remediations for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = remediations.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- RLS policies for audit_logs (read-only for workspace members)
create policy "Members can read workspace audit logs"
    on public.audit_logs for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = audit_logs.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );

-- RLS policies for regulatory_updates (public read)
create policy "Users can read regulatory updates"
    on public.regulatory_updates for select
    using (true);

-- RLS policies for regulatory_reviews
create policy "Members can read workspace regulatory reviews"
    on public.regulatory_reviews for select
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_id = regulatory_reviews.workspace_id
            and user_id = auth.uid()
            and status = 'active'
        )
    );
