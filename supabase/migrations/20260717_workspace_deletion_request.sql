-- Migration: Workspace Deletion Request (GDPR Article 5(1)(e), 17)
-- Implements secure workspace deletion with grace period and recovery window
-- Date: 2026-07-17

create table if not exists public.workspace_deletion_request (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    requested_by uuid not null references auth.users(id) on delete cascade,
    requested_at timestamptz not null default now(),
    scheduled_deletion_at timestamptz not null,
    reason text,
    status text not null check (status in ('pending', 'confirmed', 'cancelled', 'executed')) default 'pending',
    ip_address text,
    user_agent text,
    password_verified_at timestamptz
);

create index if not exists workspace_deletion_request_workspace_id_idx on public.workspace_deletion_request (workspace_id);
create index if not exists workspace_deletion_request_requested_by_idx on public.workspace_deletion_request (requested_by);
create index if not exists workspace_deletion_request_status_idx on public.workspace_deletion_request (status);
create index if not exists workspace_deletion_request_scheduled_idx on public.workspace_deletion_request (scheduled_deletion_at);

-- Enable RLS
alter table public.workspace_deletion_request enable row level security;

-- Workspace owners can read their workspace's deletion requests
create policy "Workspace owners can read deletion requests" on public.workspace_deletion_request
    for select using (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_deletion_request.workspace_id
            and w.owner_id = auth.uid()
        )
    );

-- Service role can insert/update (API routes handle this)
create policy "Service role can manage deletion requests" on public.workspace_deletion_request
    for all using (false) with check (false);
