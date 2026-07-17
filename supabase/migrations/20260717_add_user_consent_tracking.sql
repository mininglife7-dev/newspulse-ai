-- Migration: Add GDPR Article 7 Consent Tracking to Profiles
-- Adds consent fields to profiles table to track lawful basis for data processing
-- Date: 2026-07-17

-- Add consent columns to profiles table
alter table public.profiles
add column if not exists consents_accepted_at timestamptz,
add column if not exists consent_version text default '1.0',
add column if not exists gdpr_consent boolean default false,
add column if not exists marketing_consent boolean default false;

-- Create audit log table for consent changes (GDPR Article 30 compliance)
create table if not exists public.consent_audit_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    action text not null check (action in ('consent_given', 'consent_withdrawn', 'consent_updated')),
    gdpr_consent boolean,
    marketing_consent boolean,
    consent_version text not null,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

-- Create index for consent audit lookups
create index if not exists consent_audit_log_user_id_idx on public.consent_audit_log (user_id);
create index if not exists consent_audit_log_created_at_idx on public.consent_audit_log (created_at);

-- Enable RLS on consent_audit_log
alter table public.consent_audit_log enable row level security;

-- RLS policies for consent_audit_log
create policy "Users can read their own consent audit log" on public.consent_audit_log
    for select using (user_id = auth.uid());

-- Workspace owners/admins can read consent logs for their workspace members (for compliance)
create policy "Workspace admins can read member consent logs" on public.consent_audit_log
    for select using (
        exists (
            select 1 from public.workspace_members wm
            where wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.role in ('owner', 'admin')
            and exists (
                select 1 from public.workspace_members wm2
                where wm2.workspace_id = wm.workspace_id
                and wm2.user_id = consent_audit_log.user_id
            )
        )
    );
