-- Migration: Account Deletion Request (GDPR Article 17)
-- Implements secure account deletion with reauthentication, preview, and recovery window
-- Date: 2026-07-17

create table if not exists public.account_deletion_request (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    requested_at timestamptz not null default now(),
    scheduled_deletion_at timestamptz not null,
    reason text,
    status text not null check (status in ('pending', 'confirmed', 'cancelled', 'executed')) default 'pending',
    ip_address text,
    user_agent text,
    password_verified_at timestamptz
);

create index if not exists account_deletion_request_user_id_idx on public.account_deletion_request (user_id);
create index if not exists account_deletion_request_status_idx on public.account_deletion_request (status);
create index if not exists account_deletion_request_scheduled_idx on public.account_deletion_request (scheduled_deletion_at);

-- Enable RLS
alter table public.account_deletion_request enable row level security;

-- Users can read their own deletion requests
drop policy if exists "Users can read own deletion requests" on public.account_deletion_request;
create policy "Users can read own deletion requests" on public.account_deletion_request
    for select using (user_id = auth.uid());

-- Service role can insert/update (API routes handle this via service-role key which bypasses RLS)
drop policy if exists "Service role can manage deletion requests" on public.account_deletion_request;
create policy "Service role can manage deletion requests" on public.account_deletion_request
    for all using (false) with check (false);
