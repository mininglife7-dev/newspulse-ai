-- Migration: Add DPIA (Data Processing Impact Assessment) Support
-- GDPR Articles 35-36: Mandatory for high-risk AI systems
-- Date: 2026-07-17

create table if not exists public.dpia_assessments (
    id uuid primary key default gen_random_uuid(),
    ai_system_id uuid not null references public.ai_systems(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    description text,
    data_categories text[] default array[]::text[],
    purposes text[] default array[]::text[],
    recipients text[] default array[]::text[],
    retention_period text,
    risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')) default 'medium',
    mitigations text[] default array[]::text[],
    status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
    assessed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists dpia_assessments_ai_system_id_idx on public.dpia_assessments (ai_system_id);
create index if not exists dpia_assessments_workspace_id_idx on public.dpia_assessments (workspace_id);
create index if not exists dpia_assessments_risk_level_idx on public.dpia_assessments (risk_level);

-- Enable RLS on DPIA assessments
alter table public.dpia_assessments enable row level security;

-- RLS policies for DPIA assessments
create policy "Users can read DPIAs for their workspace" on public.dpia_assessments
    for select using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = dpia_assessments.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
        )
    );

create policy "Workspace admins/owners can update DPIAs" on public.dpia_assessments
    for update using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = dpia_assessments.workspace_id
            and wm.user_id = auth.uid()
            and wm.role in ('owner', 'admin')
            and wm.status = 'active'
        )
    );

create policy "Workspace admins/owners can delete DPIAs" on public.dpia_assessments
    for delete using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = dpia_assessments.workspace_id
            and wm.user_id = auth.uid()
            and wm.role in ('owner', 'admin')
            and wm.status = 'active'
        )
    );

create policy "Workspace members can insert DPIAs" on public.dpia_assessments
    for insert with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = dpia_assessments.workspace_id
            and wm.user_id = auth.uid()
            and wm.status = 'active'
        )
    );
